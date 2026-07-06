/**
 * PhaseBar.tsx
 * ---------------------------------------------------------------------------
 * The spanning "PHASE" row above the lanes (e.g. "Bidding", "Web Design",
 * "Web Development"), matching the Gantt-style phase labels in the original
 * spreadsheet. Simpler than a full ScheduleBlock: no lane, no notes/time/
 * mode - just a label, a colour, and a date range.
 *
 * In read-only mode (public view) this just displays. In edit mode
 * (back office) clicking an existing phase opens an edit/delete dialog, and
 * an "+ Add Phase" button creates a new one via the same dialog.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPhaseBarEntry,
  removePhaseBarEntry,
  updatePhaseBarEntry,
} from "@/lib/storage/projectRepository";
import type { PhaseBarEntry } from "@/lib/storage/types";
import { clampRangeToBounds, dayIndex } from "@/lib/dateUtils";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "./gridConstants";
import { COLOR_PRESETS } from "./colorPresets";
import { cn } from "@/lib/utils";

interface PhaseBarProps {
  projectId: string;
  days: string[];
  entries: PhaseBarEntry[];
  readOnly: boolean;
  onProjectChanged: () => void;
}

export function PhaseBar({ projectId, days, entries, readOnly, onProjectChanged }: PhaseBarProps) {
  const [editingEntry, setEditingEntry] = useState<PhaseBarEntry | "new" | null>(null);

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  return (
    <div className="relative flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r bg-background px-2 py-2 text-xs font-semibold text-muted-foreground"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        Phase
        {!readOnly && (
          <Button size="icon" variant="ghost" className="ml-auto size-6" onClick={() => setEditingEntry("new")}>
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: 36 }}>
        {entries.map((entry) => {
          const startIdx = dayIndex(days, entry.startDate);
          const endIdx = dayIndex(days, entry.endDate);
          // Skip phases entirely outside the visible range.
          if (startIdx === -1 && endIdx === -1 && (entry.endDate < rangeStart || entry.startDate > rangeEnd)) return null;
          const clampedStart = Math.max(startIdx, 0);
          const clampedEnd = endIdx === -1 ? days.length - 1 : endIdx;

          return (
            <button
              key={entry.id}
              type="button"
              disabled={readOnly}
              onClick={() => setEditingEntry(entry)}
              className={cn(
                "absolute top-0 flex h-9 items-center justify-center truncate rounded px-2 text-xs font-semibold text-white shadow-sm",
                !readOnly && "cursor-pointer hover:brightness-95",
              )}
              style={{
                left: clampedStart * DAY_COLUMN_WIDTH_PX + 2,
                width: (clampedEnd - clampedStart + 1) * DAY_COLUMN_WIDTH_PX - 4,
                backgroundColor: entry.color,
              }}
              title={entry.label}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {editingEntry && (
        <PhaseEntryDialog
          projectId={projectId}
          entry={editingEntry === "new" ? null : editingEntry}
          bounds={{ startDate: rangeStart, endDate: rangeEnd }}
          onClose={() => setEditingEntry(null)}
          onSaved={onProjectChanged}
        />
      )}
    </div>
  );
}

function PhaseEntryDialog({
  projectId,
  entry,
  bounds,
  onClose,
  onSaved,
}: {
  projectId: string;
  entry: PhaseBarEntry | null;
  bounds: { startDate: string; endDate: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(entry?.label ?? "");
  const [startDate, setStartDate] = useState(entry?.startDate ?? bounds.startDate);
  const [endDate, setEndDate] = useState(entry?.endDate ?? bounds.startDate);
  const [color, setColor] = useState(entry?.color ?? COLOR_PRESETS[0].value);

  function handleSave() {
    const clamped = clampRangeToBounds(startDate, endDate <= startDate ? startDate : endDate, bounds.startDate, bounds.endDate);
    if (entry) {
      updatePhaseBarEntry(projectId, { ...entry, label, color, ...clamped });
    } else {
      addPhaseBarEntry(projectId, { label, color, ...clamped });
    }
    onSaved();
    onClose();
  }

  function handleDelete() {
    if (entry) removePhaseBarEntry(projectId, entry.id);
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Phase" : "Add Phase"}</DialogTitle>
          <DialogDescription>A phase spans one or more days and appears as a bar above the lanes.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Phase label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Web Design" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} min={bounds.startDate} max={bounds.endDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>End date</Label>
              <Input type="date" value={endDate} min={bounds.startDate} max={bounds.endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
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
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {entry ? (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={!label.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
