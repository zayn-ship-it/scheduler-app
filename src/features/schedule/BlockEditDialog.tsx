/**
 * BlockEditDialog.tsx
 * ---------------------------------------------------------------------------
 * shadcn Dialog form for creating or editing a single ScheduleBlock's
 * metadata (title, dates, time, mode, information, colour, lane, linked
 * person). Does NOT handle drag/resize - this is purely the create/edit-by-
 * typing path. Saving calls straight into projectRepository and then tells
 * the parent grid to re-read the project from storage.
 */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addBlock, insertDelayBlock, removeBlock, removeDelayBlock, updateBlock } from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import { getLaneTitleOptions } from "@/lib/storage/laneTitleOptionRepository";
import {
  LANE_LABELS,
  LANE_ORDER,
  type BlockLink,
  type Deliverable,
  type Lane,
  type LaneTitleOption,
  type Mode,
  type ScheduleBlock,
} from "@/lib/storage/types";
import { clampRangeToBounds, formatDisplayDate } from "@/lib/dateUtils";
import { normalizeLinkUrl } from "./deliverableFormat";
import { COLOR_PRESETS, RJF_BLOCK_COLOR } from "./colorPresets";
import { cn } from "@/lib/utils";

interface BlockEditDialogProps {
  projectId: string;
  /** The block being edited, or a partial "seed" (lane + default dates) when creating a new one. */
  block: ScheduleBlock | { lane: Lane; startDate: string; endDate: string };
  bounds: { startDate: string; endDate: string };
  /** The project's own deliverables, offered as attachable items in the Information section. */
  deliverables: Deliverable[];
  onClose: () => void;
  onSaved: () => void;
}

/** Sentinel Select value for "switch to a free-text title" - never a real preset id/label. */
const CUSTOM_TITLE_VALUE = "__custom_title__";

function isExistingBlock(b: BlockEditDialogProps["block"]): b is ScheduleBlock {
  return "id" in b;
}

export function BlockEditDialog({ projectId, block, bounds, deliverables, onClose, onSaved }: BlockEditDialogProps) {
  const existing = isExistingBlock(block) ? block : null;
  const [people, setPeople] = useState<any[]>([]);
  const [laneTitleOptions, setLaneTitleOptions] = useState<LaneTitleOption[]>([]);
  const [isInsertingDelay, setIsInsertingDelay] = useState(false);
  const [isRemovingDelay, setIsRemovingDelay] = useState(false);

  useEffect(() => {
    getPeople().then(setPeople);
    getLaneTitleOptions().then(setLaneTitleOptions);
  }, []);

  // A stored timeRange is "HH:mm-HH:mm" (see handleSave) - split it back into the two <input type="time"> values for editing.
  const [existingTimeStart, existingTimeEnd] = (existing?.timeRange ?? "").split("-").map((s) => s.trim());

  const [lane, setLane] = useState<Lane>(block.lane);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [startDate, setStartDate] = useState(block.startDate);
  const [endDate, setEndDate] = useState(block.endDate);
  const [timeStart, setTimeStart] = useState(existingTimeStart ?? "");
  const [timeEnd, setTimeEnd] = useState(existingTimeEnd ?? "");
  const [mode, setMode] = useState<Mode>(existing?.mode ?? null);
  const [informationText, setInformationText] = useState((existing?.information ?? []).join("\n"));
  const [deliverableIds, setDeliverableIds] = useState<string[]>(existing?.deliverableIds ?? []);
  const [color, setColor] = useState(block.lane === "RJF" ? RJF_BLOCK_COLOR : existing?.color ?? COLOR_PRESETS[6].value);
  const [personId, setPersonId] = useState<string | null>(existing?.personId ?? null);
  const [links, setLinks] = useState<BlockLink[]>(existing?.links ?? []);

  function addLink() {
    setLinks((prev) => [...prev, { id: crypto.randomUUID(), label: "", url: "" }]);
  }
  function updateLink(id: string, patch: Partial<BlockLink>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  const showColorPicker = lane === "CLIENT";
  const showExternalLink = lane === "RJF" || lane === "CLIENT";
  const isLeaveTracker = lane === "LEAVE_TRACKER";
  const showDeliverablePicker = lane !== "LEAVE_TRACKER" && lane !== "INTERNAL";
  const titleOptionsForLane = laneTitleOptions.filter((o) => o.lane === lane);

  // Only a brand-new RJF/Client block can be turned into a delay marker - editing an existing block never offers this.
  const canBeDelay = !existing && (lane === "RJF" || lane === "CLIENT");
  const [isDelayBlock, setIsDelayBlock] = useState(false);
  const [delayReason, setDelayReason] = useState("");

  // The dropdown offers preset titles, but a custom title must always remain possible (e.g. this block's
  // title was set before the preset existed, or this occasion just isn't in the list).
  const [customTitleMode, setCustomTitleMode] = useState(false);
  const hasCheckedInitialTitleMatch = useRef(false);
  useEffect(() => {
    if (hasCheckedInitialTitleMatch.current || titleOptionsForLane.length === 0) return;
    hasCheckedInitialTitleMatch.current = true;
    if (title && !titleOptionsForLane.some((o) => o.label === title)) {
      setCustomTitleMode(true);
    }
  }, [titleOptionsForLane, title]);

  useEffect(() => {
    if (lane === "RJF") {
      setColor(RJF_BLOCK_COLOR);
    } else if (!showColorPicker) {
      setColor("");
    } else if (!color) {
      setColor(COLOR_PRESETS[6].value);
    }
    if (lane !== "RJF" && lane !== "CLIENT") {
      setIsDelayBlock(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane]);

  async function handleSave() {
    if (canBeDelay && isDelayBlock) {
      const clampedDelay = clampRangeToBounds(startDate, startDate, bounds.startDate, bounds.endDate);
      setIsInsertingDelay(true);
      try {
        await insertDelayBlock(projectId, lane as "RJF" | "CLIENT", clampedDelay.startDate, delayReason.trim() || undefined);
        toast.success("Delay inserted - schedule shifted forward by a day, previous state saved as a version");
        onSaved();
        onClose();
      } catch (error) {
        console.error("Failed to insert delay:", error);
        toast.error("Failed to insert delay");
        setIsInsertingDelay(false);
      }
      return;
    }

    const clamped = clampRangeToBounds(
      startDate,
      endDate < startDate ? startDate : endDate,
      bounds.startDate,
      bounds.endDate,
    );
    const information = informationText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const timeRange = timeStart && timeEnd ? `${timeStart}-${timeEnd}` : timeStart || "";

    const resolvedTitle = isLeaveTracker
      ? people.find((p) => p.id === personId)?.name ?? "Leave"
      : title;

    const payload = {
      lane,
      title: resolvedTitle,
      timeRange,
      mode,
      information,
      deliverableIds,
      color,
      personId,
      links: showExternalLink
        ? links
            .filter((l) => l.url.trim())
            .map((l) => ({ ...l, label: l.label.trim(), url: normalizeLinkUrl(l.url.trim()) }))
        : [],
      isDelay: existing?.isDelay ?? false,
      delayReason: existing?.delayReason ?? null,
      ...clamped,
    };

    try {
      if (existing) {
        await updateBlock(projectId, { ...existing, ...payload });
        toast.success("Block updated");
      } else {
        await addBlock(projectId, payload);
        toast.success("Block created");
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save block:", error);
      toast.error("Failed to save block");
    }
  }

  async function handleDelete() {
    if (!existing) return;

    if (existing.isDelay) {
      setIsRemovingDelay(true);
      try {
        await removeDelayBlock(projectId, existing.id);
        toast.success("Delay removed - schedule shifted back");
        onSaved();
        onClose();
      } catch (error) {
        console.error("Failed to remove delay:", error);
        toast.error("Failed to remove delay");
        setIsRemovingDelay(false);
      }
      return;
    }

    try {
      await removeBlock(projectId, existing.id);
      toast.success("Block deleted");
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to delete block:", error);
      toast.error("Failed to delete block");
    }
  }

  if (existing?.isDelay) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delay marker</DialogTitle>
            <DialogDescription>
              This is a delay marker on {formatDisplayDate(existing.startDate)}, in the {LANE_LABELS[existing.lane]}{" "}
              lane. It has no
              editable fields - deleting it shifts every RJF/Client block and phase on or after this date back by one
              day, undoing the delay.
            </DialogDescription>
          </DialogHeader>
          {existing.delayReason && (
            <p className="rounded-md bg-muted/60 p-3 text-sm text-foreground">{existing.delayReason}</p>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={isRemovingDelay}>
              {isRemovingDelay ? "Removing…" : "Delete"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Block" : "Add Block"}</DialogTitle>
          <DialogDescription>
            Fill in the details for this schedule item. Drag its edges to resize, or drag its body to move it, once
            it's on the grid.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className={cn("grid gap-3", isLeaveTracker ? "grid-cols-1" : "grid-cols-2")}>
            <div className="flex flex-col gap-2">
              <Label>Lane</Label>
              <Select value={lane} onValueChange={(v) => setLane(v as Lane)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANE_ORDER.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isLeaveTracker && (
              <div className="flex flex-col gap-2">
                <Label>Mode</Label>
                <Select value={mode ?? "none"} onValueChange={(v) => setMode(v === "none" ? null : (v as Mode))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">N/A</SelectItem>
                    <SelectItem value="online">
                      <Icon name="videocam" fill size={16} />
                      Online
                    </SelectItem>
                    <SelectItem value="offline">
                      <Icon name="location_on" fill size={16} />
                      Offline
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isLeaveTracker && !isDelayBlock && (
            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              {titleOptionsForLane.length > 0 ? (
                <>
                  <Select
                    value={customTitleMode ? CUSTOM_TITLE_VALUE : title}
                    onValueChange={(v) => {
                      if (v === CUSTOM_TITLE_VALUE) {
                        setCustomTitleMode(true);
                      } else {
                        setCustomTitleMode(false);
                        setTitle(v);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a title" />
                    </SelectTrigger>
                    <SelectContent>
                      {titleOptionsForLane.map((o) => (
                        <SelectItem key={o.id} value={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_TITLE_VALUE}>Custom title…</SelectItem>
                    </SelectContent>
                  </Select>
                  {customTitleMode && (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Client Review"
                      autoFocus
                    />
                  )}
                </>
              ) : (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client Review" />
              )}
            </div>
          )}

          <div className={cn("grid gap-3", isDelayBlock ? "grid-cols-1" : "grid-cols-2")}>
            <div className="flex flex-col gap-2">
              <Label>{isDelayBlock ? "Delay date" : "Start date"}</Label>
              <Input
                type="date"
                value={startDate}
                min={bounds.startDate}
                max={bounds.endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!isDelayBlock && (
              <div className="flex flex-col gap-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={bounds.startDate}
                  max={bounds.endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {!isDelayBlock && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Start time</Label>
                  <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>End time</Label>
                  <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Deliverables</Label>
                  {showDeliverablePicker && (
                    <DeliverablePicker
                      deliverables={deliverables}
                      selectedIds={deliverableIds}
                      onChange={setDeliverableIds}
                    />
                  )}
                </div>
                <Textarea
                  value={informationText}
                  onChange={(e) => setInformationText(e.target.value)}
                  rows={3}
                  placeholder={"Squeeze Page Design in Progress\nSqueeze Page Designs V1"}
                />
                {deliverableIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {deliverableIds.map((id) => {
                      const deliverable = deliverables.find((d) => d.id === id);
                      if (!deliverable) return null;
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {deliverable.description || deliverable.identifier || "Untitled deliverable"}
                          <button
                            type="button"
                            onClick={() => setDeliverableIds((prev) => prev.filter((existingId) => existingId !== id))}
                            className="rounded-full hover:bg-foreground/10"
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>{isLeaveTracker ? "Person" : "Linked person (optional, mainly for Leave Tracker)"}</Label>
                <Select value={personId ?? "none"} onValueChange={(v) => setPersonId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {!isDelayBlock && showExternalLink && (
            <div className="flex flex-col gap-2">
              <Label>Links</Label>
              {links.map((link) => (
                <div key={link.id} className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label className="text-xs font-normal text-muted-foreground">Link title (optional)</Label>
                    <Input
                      value={link.label}
                      onChange={(e) => updateLink(link.id, { label: e.target.value })}
                      placeholder="e.g. Zoom Call"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label className="text-xs font-normal text-muted-foreground">Link URL</Label>
                    <Input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeLink(link.id)}>
                    <Icon name="delete" size={16} />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={addLink} className="self-start">
                <Icon name="add" size={16} />
                Add link
              </Button>
            </div>
          )}

          {!isDelayBlock && showColorPicker && (
            <div className="flex flex-col gap-2">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={cn(
                      "size-7 rounded-full border-2",
                      color === preset.value ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          )}

          {canBeDelay && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <Label>Delay?</Label>
              <Select value={isDelayBlock ? "yes" : "no"} onValueChange={(v) => setIsDelayBlock(v === "yes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
              {isDelayBlock && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Saving will add a grey delay marker on this date and shift every RJF/Client block and phase on or
                    after it forward by one day. The current schedule is saved as a version first.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label>Reason (optional)</Label>
                    <Textarea
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Client hasn't paid yet so there is a delay"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={handleSave}
            disabled={isDelayBlock ? isInsertingDelay : isLeaveTracker ? !personId : !title.trim()}
          >
            {isDelayBlock ? (isInsertingDelay ? "Inserting delay…" : "Insert Delay") : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small "+" button that opens a checkbox list of the project's deliverables to attach to this block's Deliverables section. */
function DeliverablePicker({
  deliverables,
  selectedIds,
  onChange,
}: {
  deliverables: Deliverable[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((existingId) => existingId !== id));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" className="size-6" disabled={deliverables.length === 0}>
          <span className="text-sm leading-none">+</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Attach deliverables</p>
        {deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deliverables on this project yet.</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {deliverables.map((deliverable) => (
              <label key={deliverable.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={selectedIds.includes(deliverable.id)}
                  onCheckedChange={(checked) => toggle(deliverable.id, checked === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{deliverable.description || deliverable.identifier || "(untitled)"}</span>
                  {deliverable.description && deliverable.identifier && (
                    <span className="text-muted-foreground"> — {deliverable.identifier}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
