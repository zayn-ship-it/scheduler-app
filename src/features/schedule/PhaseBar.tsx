/**
 * PhaseBar.tsx
 * ---------------------------------------------------------------------------
 * The spanning "PHASE" row above the lanes (e.g. "Bidding", "Web Design",
 * "Web Development"), matching the Gantt-style phase labels in the original
 * spreadsheet. Simpler than a full ScheduleBlock: no lane, no notes/time/
 * mode - just a phase title (picked from the global master list managed in
 * Settings, which locks its colour), and a date range.
 *
 * In read-only mode (public view) this just displays. In edit mode
 * (back office) clicking an existing phase opens an edit/delete dialog, and
 * an "+ Add Phase" button creates a new one via the same dialog. Phases can
 * also be dragged to move or resized by their edges, same as schedule
 * blocks (see useBlockDragResize.ts). Clicking an empty part of a day column
 * (not on top of an existing phase) also opens the add-phase dialog seeded
 * with that exact date, same as clicking an empty day cell in a lane row
 * (see LaneRow.tsx).
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  addPhaseBarEntry,
  removePhaseBarEntry,
  updatePhaseBarEntry,
} from "@/lib/storage/projectRepository";
import { getPhaseTitles } from "@/lib/storage/phaseTitleRepository";
import type { PhaseBarEntry, PhaseTitle } from "@/lib/storage/types";
import { clampRangeToBounds, dayIndex } from "@/lib/dateUtils";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "./gridConstants";
import { useBlockDragResize } from "./useBlockDragResize";
import { cn } from "@/lib/utils";

interface PhaseBarProps {
  projectId: string;
  days: string[];
  entries: PhaseBarEntry[];
  readOnly: boolean;
  onProjectChanged: () => void;
}

export function PhaseBar({ projectId, days, entries, readOnly, onProjectChanged }: PhaseBarProps) {
  const [editingEntry, setEditingEntry] = useState<PhaseBarEntry | null>(null);
  const [addSeedDate, setAddSeedDate] = useState<string | null>(null);
  const [phaseTitles, setPhaseTitles] = useState<PhaseTitle[]>([]);

  useEffect(() => {
    getPhaseTitles().then(setPhaseTitles);
  }, []);

  const phaseTitlesById = new Map(phaseTitles.map((t) => [t.id, t]));
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const bounds = { startDate: rangeStart, endDate: rangeEnd };

  return (
    <div className="relative flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r bg-background px-2 py-2 text-xs font-semibold text-muted-foreground"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        Phase
        {!readOnly && (
          <Button size="icon" variant="ghost" className="ml-auto size-6" onClick={() => setAddSeedDate(days[0])}>
            <Icon name="add" size={14} />
          </Button>
        )}
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: 36 }}>
        {!readOnly &&
          days.map((day, index) => (
            <button
              key={day}
              type="button"
              className="absolute top-0 h-full cursor-pointer border-0 bg-transparent p-0 outline-none hover:bg-accent/40"
              style={{ left: index * DAY_COLUMN_WIDTH_PX, width: DAY_COLUMN_WIDTH_PX }}
              onClick={() => setAddSeedDate(day)}
              aria-label={`Add phase on ${day}`}
            />
          ))}

        {entries.map((entry) => {
          const startIdx = dayIndex(days, entry.startDate);
          const endIdx = dayIndex(days, entry.endDate);
          // Skip phases entirely outside the visible range.
          if (startIdx === -1 && endIdx === -1 && (entry.endDate < rangeStart || entry.startDate > rangeEnd)) return null;

          const title = phaseTitlesById.get(entry.phaseTitleId);

          return (
            <PhaseBarEntryItem
              key={entry.id}
              projectId={projectId}
              entry={entry}
              title={title}
              days={days}
              bounds={bounds}
              readOnly={readOnly}
              onProjectChanged={onProjectChanged}
              onEdit={() => setEditingEntry(entry)}
            />
          );
        })}
      </div>

      {(editingEntry || addSeedDate) && (
        <PhaseEntryDialog
          projectId={projectId}
          entry={editingEntry}
          seedDate={addSeedDate ?? undefined}
          phaseTitles={phaseTitles}
          bounds={bounds}
          onClose={() => {
            setEditingEntry(null);
            setAddSeedDate(null);
          }}
          onSaved={onProjectChanged}
        />
      )}
    </div>
  );
}

function PhaseBarEntryItem({
  projectId,
  entry,
  title,
  days,
  bounds,
  readOnly,
  onProjectChanged,
  onEdit,
}: {
  projectId: string;
  entry: PhaseBarEntry;
  title: PhaseTitle | undefined;
  days: string[];
  bounds: { startDate: string; endDate: string };
  readOnly: boolean;
  onProjectChanged: () => void;
  onEdit: () => void;
}) {
  const justDraggedRef = useRef(false);

  const { isDragging, previewStartDate, previewEndDate, onBodyPointerDown, onLeftHandlePointerDown, onRightHandlePointerDown } =
    useBlockDragResize({
      startDate: entry.startDate,
      endDate: entry.endDate,
      bounds,
      disabled: readOnly,
      onCommit: async (range) => {
        justDraggedRef.current = range.startDate !== entry.startDate || range.endDate !== entry.endDate;
        try {
          await updatePhaseBarEntry(projectId, { ...entry, ...range });
          onProjectChanged();
        } catch (error) {
          console.error("Failed to update phase:", error);
        }
      },
    });

  const startIdx = Math.max(dayIndex(days, previewStartDate), 0);
  const endIdx = dayIndex(days, previewEndDate);
  const clampedEnd = endIdx === -1 ? days.length - 1 : endIdx;
  const label = title?.label ?? "Unknown phase";
  const color = title?.color ?? "#94a3b8";

  return (
    <div
      className={cn(
        "group absolute top-0 flex h-9 items-center justify-center truncate rounded px-2 text-xs font-semibold text-white shadow-sm select-none",
        !readOnly && "cursor-grab active:cursor-grabbing",
        isDragging && "z-30 opacity-90 shadow-lg",
      )}
      style={{
        left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
        width: (clampedEnd - startIdx + 1) * DAY_COLUMN_WIDTH_PX - 4,
        backgroundColor: color,
      }}
      onPointerDown={onBodyPointerDown}
      onClick={() => {
        if (readOnly || isDragging) return;
        if (justDraggedRef.current) {
          justDraggedRef.current = false;
          return;
        }
        onEdit();
      }}
      title={label}
    >
      {!readOnly && (
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
          onPointerDown={onLeftHandlePointerDown}
        >
          <div className="mx-auto h-full w-0.5 bg-white/70" />
        </div>
      )}
      {label}
      {!readOnly && (
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
          onPointerDown={onRightHandlePointerDown}
        >
          <div className="mx-auto h-full w-0.5 bg-white/70" />
        </div>
      )}
    </div>
  );
}

function PhaseEntryDialog({
  projectId,
  entry,
  seedDate,
  phaseTitles,
  bounds,
  onClose,
  onSaved,
}: {
  projectId: string;
  entry: PhaseBarEntry | null;
  /** Prefills start/end date when adding a new phase via clicking an empty day cell. */
  seedDate?: string;
  phaseTitles: PhaseTitle[];
  bounds: { startDate: string; endDate: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [phaseTitleId, setPhaseTitleId] = useState(entry?.phaseTitleId ?? phaseTitles[0]?.id ?? "");
  const [startDate, setStartDate] = useState(entry?.startDate ?? seedDate ?? bounds.startDate);
  const [endDate, setEndDate] = useState(entry?.endDate ?? seedDate ?? bounds.startDate);

  function handleSave() {
    if (!phaseTitleId) return;
    const clamped = clampRangeToBounds(startDate, endDate <= startDate ? startDate : endDate, bounds.startDate, bounds.endDate);
    if (entry) {
      updatePhaseBarEntry(projectId, { ...entry, phaseTitleId, ...clamped });
    } else {
      addPhaseBarEntry(projectId, { phaseTitleId, ...clamped });
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
            <Label>Phase title</Label>
            {phaseTitles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No phase titles yet — add one in Settings first.</p>
            ) : (
              <Select value={phaseTitleId} onValueChange={setPhaseTitleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseTitles.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                        <span>
                          {t.label}
                          {t.notes && <span className="ml-1.5 text-xs text-muted-foreground">{t.notes}</span>}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {entry ? (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={!phaseTitleId}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
