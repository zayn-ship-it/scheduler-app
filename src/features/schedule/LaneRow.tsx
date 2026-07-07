/**
 * LaneRow.tsx
 * ---------------------------------------------------------------------------
 * Renders one lane (RJF / Suppliers / Internal / Client / Leave Tracker) as
 * a full-width row: a sticky label cell on the left, and a day-track area on
 * the right containing that lane's ScheduleBlocks.
 *
 * If two blocks in the same lane have overlapping date ranges, they can't
 * occupy the same visual row without covering each other - `assignRows`
 * below does simple greedy interval scheduling to give each overlapping
 * block its own stacked row, so nothing is ever hidden behind another block.
 *
 * Clicking an empty part of a day column (not on top of an existing block)
 * opens the add-block dialog pre-seeded with that exact date as both the
 * start and end date - a set of invisible per-day click targets sits behind
 * the blocks for this. The sticky label's "+" button does the same thing but
 * seeded to the first visible day, for adding a block without pointing at a
 * specific date.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Deliverable, Lane, ScheduleBlock as ScheduleBlockType } from "@/lib/storage/types";
import { LANE_LABELS } from "@/lib/storage/types";
import { getHolidayForDate } from "@/data/saPublicHolidays";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX, BLOCK_ROW_HEIGHT_PX } from "./gridConstants";
import { ScheduleBlock } from "./ScheduleBlock";
import { BlockEditDialog } from "./BlockEditDialog";

/** Greedily assigns each block a stacking row index such that no two overlapping blocks share a row. */
function assignRows(blocks: ScheduleBlockType[]): Map<string, number> {
  const sorted = [...blocks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const rowEndDates: string[] = []; // rowEndDates[row] = the endDate of the last block placed in that row
  const assignment = new Map<string, number>();

  for (const block of sorted) {
    let placedRow = rowEndDates.findIndex((endDate) => endDate < block.startDate);
    if (placedRow === -1) {
      placedRow = rowEndDates.length;
      rowEndDates.push(block.endDate);
    } else {
      rowEndDates[placedRow] = block.endDate;
    }
    assignment.set(block.id, placedRow);
  }

  return assignment;
}

interface LaneRowProps {
  projectId: string;
  lane: Lane;
  blocks: ScheduleBlockType[];
  deliverables: Deliverable[];
  days: string[];
  bounds: { startDate: string; endDate: string };
  readOnly: boolean;
  onProjectChanged: () => void;
}

export function LaneRow({ projectId, lane, blocks, deliverables, days, bounds, readOnly, onProjectChanged }: LaneRowProps) {
  // The date to seed the add-block dialog with, or null when it's closed. Set either by the
  // sticky "+" button (first visible day) or by clicking an empty day cell (that exact day).
  const [addSeedDate, setAddSeedDate] = useState<string | null>(null);
  const rowAssignment = assignRows(blocks);
  const rowCount = Math.max(1, ...Array.from(rowAssignment.values()).map((r) => r + 1));
  const trackHeight = rowCount * BLOCK_ROW_HEIGHT_PX;

  return (
    <div className="flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r bg-background px-2 py-2 text-xs font-semibold"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        {LANE_LABELS[lane]}
        {!readOnly && (
          <Button size="icon" variant="ghost" className="ml-auto size-6" onClick={() => setAddSeedDate(days[0])}>
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: trackHeight }}>
        {lane === "LEAVE_TRACKER" &&
          days.map((day, index) => {
            const holiday = getHolidayForDate(day);
            if (!holiday) return null;
            return (
              <div
                key={`holiday-${day}`}
                className="pointer-events-none absolute top-0 h-full bg-muted bg-[repeating-linear-gradient(45deg,theme(colors.muted.foreground/40%),theme(colors.muted.foreground/40%)_2px,transparent_2px,transparent_4px)]"
                style={{ left: index * DAY_COLUMN_WIDTH_PX, width: DAY_COLUMN_WIDTH_PX }}
                title={holiday.name}
              />
            );
          })}

        {!readOnly &&
          days.map((day, index) => (
            <button
              key={day}
              type="button"
              className="absolute top-0 h-full cursor-pointer border-0 bg-transparent p-0 outline-none hover:bg-accent/40"
              style={{ left: index * DAY_COLUMN_WIDTH_PX, width: DAY_COLUMN_WIDTH_PX }}
              onClick={() => setAddSeedDate(day)}
              aria-label={`Add block on ${day}`}
            />
          ))}

        {blocks.map((block) => (
          <ScheduleBlock
            key={block.id}
            projectId={projectId}
            block={block}
            deliverables={deliverables}
            days={days}
            bounds={bounds}
            rowIndex={rowAssignment.get(block.id) ?? 0}
            readOnly={readOnly}
            onProjectChanged={onProjectChanged}
          />
        ))}
      </div>

      {addSeedDate && (
        <BlockEditDialog
          projectId={projectId}
          block={{ lane, startDate: addSeedDate, endDate: addSeedDate }}
          bounds={bounds}
          deliverables={deliverables}
          onClose={() => setAddSeedDate(null)}
          onSaved={onProjectChanged}
        />
      )}
    </div>
  );
}
