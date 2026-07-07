/**
 * BlockEditDialog.tsx
 * ---------------------------------------------------------------------------
 * shadcn Dialog form for creating or editing a single ScheduleBlock's
 * metadata (title, dates, time, mode, information, colour, lane, linked
 * person). Does NOT handle drag/resize - this is purely the create/edit-by-
 * typing path. Saving calls straight into projectRepository and then tells
 * the parent grid to re-read the project from storage.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { addBlock, removeBlock, updateBlock } from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import { getLaneTitleOptions } from "@/lib/storage/laneTitleOptionRepository";
import {
  LANE_LABELS,
  LANE_ORDER,
  type Deliverable,
  type Lane,
  type LaneTitleOption,
  type Mode,
  type ScheduleBlock,
} from "@/lib/storage/types";
import { clampRangeToBounds } from "@/lib/dateUtils";
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

function isExistingBlock(b: BlockEditDialogProps["block"]): b is ScheduleBlock {
  return "id" in b;
}

export function BlockEditDialog({ projectId, block, bounds, deliverables, onClose, onSaved }: BlockEditDialogProps) {
  const existing = isExistingBlock(block) ? block : null;
  const [people, setPeople] = useState<any[]>([]);
  const [laneTitleOptions, setLaneTitleOptions] = useState<LaneTitleOption[]>([]);

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
  const [externalLink, setExternalLink] = useState(existing?.externalLink ?? "");
  const [linkLabel, setLinkLabel] = useState(existing?.linkLabel ?? "");

  const showColorPicker = lane === "CLIENT";
  const showExternalLink = lane === "RJF" || lane === "CLIENT";
  const isLeaveTracker = lane === "LEAVE_TRACKER";
  const titleOptionsForLane = laneTitleOptions.filter((o) => o.lane === lane);

  useEffect(() => {
    if (lane === "RJF") {
      setColor(RJF_BLOCK_COLOR);
    } else if (!showColorPicker) {
      setColor("");
    } else if (!color) {
      setColor(COLOR_PRESETS[6].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane]);

  async function handleSave() {
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
      externalLink: showExternalLink ? externalLink.trim() || null : null,
      linkLabel: showExternalLink ? linkLabel.trim() || null : null,
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
    try {
      if (existing) await removeBlock(projectId, existing.id);
      toast.success("Block deleted");
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to delete block:", error);
      toast.error("Failed to delete block");
    }
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
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isLeaveTracker && (
            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              {titleOptionsForLane.length > 0 ? (
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a title" />
                  </SelectTrigger>
                  <SelectContent>
                    {titleOptionsForLane.map((o) => (
                      <SelectItem key={o.id} value={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client Review" />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                min={bounds.startDate}
                max={bounds.endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
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
          </div>

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
              <Label>Information (one per line)</Label>
              <DeliverablePicker
                deliverables={deliverables}
                selectedIds={deliverableIds}
                onChange={setDeliverableIds}
              />
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
                        <X className="size-3" />
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

          {showExternalLink && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Link title (optional)</Label>
                <Input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. Zoom Call"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Link URL (optional, shown on the live link)</Label>
                <Input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {showColorPicker && (
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
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={isLeaveTracker ? !personId : !title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small "+" button that opens a checkbox list of the project's deliverables to attach to this block's Information section. */
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
        <Button type="button" size="icon" variant="outline" className="size-6" disabled={deliverables.length === 0}>
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
