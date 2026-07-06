/**
 * DayColumnHeader.tsx
 * ---------------------------------------------------------------------------
 * Renders the top row of the schedule grid: one cell per day, styled like
 * the original spreadsheet's "Mon - 8 Jun" headers. Weekends get a subtle
 * shaded background to help visually separate weeks at a glance.
 */
import { formatDayHeader, fromIsoDate } from "@/lib/dateUtils";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "./gridConstants";
import { cn } from "@/lib/utils";

export function DayColumnHeader({ days }: { days: string[] }) {
  return (
    <div className="flex border-b bg-background">
      <div
        className="sticky left-0 z-20 shrink-0 border-r bg-background"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      />
      {days.map((day) => {
        const isWeekend = [0, 6].includes(fromIsoDate(day).getDay());
        return (
          <div
            key={day}
            className={cn(
              "shrink-0 border-r px-1.5 py-2 text-center text-xs font-medium",
              isWeekend && "bg-muted/50",
            )}
            style={{ width: DAY_COLUMN_WIDTH_PX }}
          >
            {formatDayHeader(day)}
          </div>
        );
      })}
    </div>
  );
}
