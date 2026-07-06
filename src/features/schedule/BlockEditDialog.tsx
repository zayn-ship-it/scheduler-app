/**
 * BlockEditDialog.tsx
 * ---------------------------------------------------------------------------
 * shadcn Dialog form for creating or editing a single ScheduleBlock's
 * metadata (title, sub-heading, dates, time, mode, notes, colour, lane,
 * linked person). Does NOT handle drag/resize - this is purely the
 * create/edit-by-typing path. Saving calls straight into projectRepository
 * and then tells the parent grid to re-read the project from storage.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addBlock, removeBlock, updateBlock } from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import { LANE_LABELS, LANE_ORDER, type Lane, type Mode, type ScheduleBlock } from "@/lib/storage/types";
import { clampRangeToBounds } from "@/lib/dateUtils";
import { COLOR_PRESETS } from "./colorPresets";
import { cn } from "@/lib/utils";

interface BlockEditDialogProps {
  projectId: string;
  /** The block being edited, or a partial "seed" (lane + default dates) when creating a new one. */
  block: ScheduleBlock | { lane: Lane; startDate: string; endDate: string };
  bounds: { startDate: string; endDate: string };
  onClose: () => void;
  onSaved: () => void;
}

function isExistingBlock(b: BlockEditDialogProps["block"]): b is ScheduleBlock {
  return "id" in b;
}

export function BlockEditDialog({ projectId, block, bounds, onClose, onSaved }: BlockEditDialogProps) {
  const existing = isExistingBlock(block) ? block : null;
  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    getPeople().then(setPeople);
  }, []);

  // A stored timeRange is "HH:mm-HH:mm" (see handleSave) - split it back into the two <input type="time"> values for editing.
  const [existingTimeStart, existingTimeEnd] = (existing?.timeRange ?? "").split("-").map((s) => s.trim());

  const [lane, setLane] = useState<Lane>(block.lane);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [subHeading, setSubHeading] = useState(existing?.subHeading ?? "");
  const [startDate, setStartDate] = useState(block.startDate);
  const [endDate, setEndDate] = useState(block.endDate);
  const [timeStart, setTimeStart] = useState(existingTimeStart ?? "");
  const [timeEnd, setTimeEnd] = useState(existingTimeEnd ?? "");
  const [mode, setMode] = useState<Mode>(existing?.mode ?? null);
  const [notesText, setNotesText] = useState((existing?.notes ?? []).join("\n"));
  const [color, setColor] = useState(existing?.color ?? COLOR_PRESETS[6].value);
  const [personId, setPersonId] = useState<string | null>(existing?.personId ?? null);
  const [externalLink, setExternalLink] = useState(existing?.externalLink ?? "");

  const showColorPicker = lane === "RJF" || lane === "CLIENT";
  const showExternalLink = lane === "CLIENT";

  useEffect(() => {
    if (!showColorPicker) {
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
    const notes = notesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const timeRange = timeStart && timeEnd ? `${timeStart}-${timeEnd}` : timeStart || "";

    const payload = {
      lane,
      title,
      subHeading,
      timeRange,
      mode,
      notes,
      color,
      personId,
      externalLink: showExternalLink ? externalLink.trim() || null : null,
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="flex flex-col gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client Review" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Sub-heading</Label>
            <Input
              value={subHeading}
              onChange={(e) => setSubHeading(e.target.value)}
              placeholder="e.g. Squeeze Page Design V1"
            />
          </div>

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
            <Label>Notes (one per line)</Label>
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              placeholder={"Squeeze Page Design in Progress\nSqueeze Page Designs V1"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Linked person (optional, mainly for Leave Tracker)</Label>
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
            <div className="flex flex-col gap-2">
              <Label>External link (optional, shown on the live link)</Label>
              <Input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://..."
              />
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
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
