/**
 * PublicHolidayRow.tsx
 * ---------------------------------------------------------------------------
 * Auto-populated row showing South African public holidays (and the
 * agency's own office-closure days) that fall within the visible date
 * range. Consecutive days of the same holiday "run" are merged into a
 * single spanning bar rather than repeating the label on every day.
 */
import { getHolidayForDate } from "@/data/saPublicHolidays";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "./gridConstants";
import { cn } from "@/lib/utils";

interface HolidaySegment {
  startIndex: number;
  span: number;
  name: string;
  isClosure: boolean;
}

/** Groups consecutive days that share the same holiday name into single spanning segments. */
function buildSegments(days: string[]): HolidaySegment[] {
  const segments: HolidaySegment[] = [];
  let current: HolidaySegment | null = null;

  days.forEach((day, index) => {
    const holiday = getHolidayForDate(day);
    if (!holiday) {
      current = null;
      return;
    }
    if (current && current.name === holiday.name && current.startIndex + current.span === index) {
      current.span += 1;
    } else {
      current = {
        startIndex: index,
        span: 1,
        name: holiday.name,
        isClosure: holiday.type === "rjf_closed",
      };
      segments.push(current);
    }
  });

  return segments;
}

export function PublicHolidayRow({ days }: { days: string[] }) {
  const segments = buildSegments(days);
  if (segments.length === 0) return null;

  return (
    <div className="relative flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 py-2 text-xs font-semibold text-muted-foreground"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        Public Holiday
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: 32 }}>
        {segments.map((segment) => (
          <div
            key={`${segment.startIndex}-${segment.name}`}
            className={cn(
              "absolute top-0 flex h-8 items-center justify-center truncate rounded px-2 text-xs font-medium",
              segment.isClosure ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            )}
            style={{
              left: segment.startIndex * DAY_COLUMN_WIDTH_PX + 2,
              width: segment.span * DAY_COLUMN_WIDTH_PX - 4,
            }}
            title={segment.name}
          >
            {segment.name}
          </div>
        ))}
      </div>
    </div>
  );
}
