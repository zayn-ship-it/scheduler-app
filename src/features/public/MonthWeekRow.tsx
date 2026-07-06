/**
 * MonthWeekRow.tsx
 * ---------------------------------------------------------------------------
 * One week (Mon-Fri, weekends dropped entirely) of the public month
 * calendar. Renders the 5 day-number cells as a background layer (dimmed if
 * outside the current month, cross-hatched/greyed if a public holiday falls
 * on that day), then overlays two stacked "tracks" spanning across those
 * columns: the RJF lane and the Client lane.
 *
 * Each day cell that falls inside a phase gets its date number + the phase's
 * title rendered together inside a small pill coloured with that phase
 * title's locked colour (set in Settings). Admins still drag/resize phase
 * date ranges the normal way in the back office's PhaseBar.tsx - this is
 * purely how the public view *displays* the result of that.
 *
 * A block that runs longer than this week (e.g. spans a weekend, or spans
 * several weeks) is clipped to just this row's Mon-Fri window via
 * `clipRangeToRow` - the segment that results loses its rounded corner on
 * whichever side it was clipped, as a visual cue that it continues into the
 * neighbouring row.
 *
 * Each RJF/Client block renders as: title + a rounded time/mode "badge" on
 * the same first line, then a second line naming which stream it belongs to
 * (the agency's name for RJF blocks, the project's client name for Client
 * blocks) - this is deliberately the stream's identity, not the block's own
 * free-text sub-heading, so a client glancing at the calendar always sees
 * whose work each bar represents.
 */
import { ExternalLink } from "lucide-react";
import { getHolidayForDate } from "@/data/saPublicHolidays";
import { clipRangeToRow, isDateInMonth } from "@/lib/calendarUtils";
import { formatDisplayDate } from "@/lib/dateUtils";
import type { PhaseBarEntry, PhaseTitle, ScheduleBlock } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const DAY_NUMBER_HEIGHT = 24;
/** RJF/Client blocks get a tall enough row for both the title/badge line and the stream-name line. */
const BLOCK_TRACK_ROW_HEIGHT = 36;
const TRACK_GAP = 3;

interface Segment {
  id: string;
  label: string;
  /** Short pill shown inline next to the title, e.g. "17:00-18:00  online". */
  badgeText?: string;
  /** Second line under the title - the stream's identity (agency name / client name). */
  subLabel?: string;
  /** Optional external URL (Client blocks only), shown as a small clickable link icon. */
  link?: string;
  color: string;
  colStart: number;
  colSpan: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** Clips a set of date-ranged items to this row and converts them into column-indexed segments. */
function buildSegments<T extends { id: string; startDate: string; endDate: string }>(
  items: T[],
  days: string[],
  label: (item: T) => string,
  color: (item: T) => string,
  badgeText?: (item: T) => string | undefined,
  subLabel?: (item: T) => string | undefined,
  link?: (item: T) => string | undefined,
): Segment[] {
  const segments: Segment[] = [];
  for (const item of items) {
    const clipped = clipRangeToRow(item.startDate, item.endDate, days[0], days[days.length - 1]);
    if (!clipped) continue;
    const colStart = days.indexOf(clipped.start);
    const colEnd = days.indexOf(clipped.end);
    segments.push({
      id: item.id,
      label: label(item),
      badgeText: badgeText?.(item),
      subLabel: subLabel?.(item),
      link: link?.(item),
      color: color(item),
      colStart,
      colSpan: colEnd - colStart + 1,
      continuesBefore: clipped.continuesBefore,
      continuesAfter: clipped.continuesAfter,
    });
  }
  return segments;
}

/** Greedy interval stacking so overlapping segments in the same track get their own row instead of overlapping visually. */
function assignSegmentRows(segments: Segment[]): number[] {
  const rowEndCols: number[] = [];
  return segments.map((segment) => {
    let row = rowEndCols.findIndex((endCol) => endCol < segment.colStart);
    if (row === -1) {
      row = rowEndCols.length;
      rowEndCols.push(segment.colStart + segment.colSpan - 1);
    } else {
      rowEndCols[row] = segment.colStart + segment.colSpan - 1;
    }
    return row;
  });
}

function TrackLayer({
  segments,
  trackTop,
  rowHeight = BLOCK_TRACK_ROW_HEIGHT,
}: {
  segments: Segment[];
  trackTop: number;
  rowHeight?: number;
}) {
  const rows = assignSegmentRows(segments);
  const rowCount = Math.max(1, ...rows.map((r) => r + 1));

  return (
    <div className="absolute inset-x-0" style={{ top: trackTop, height: rowCount * (rowHeight + TRACK_GAP) }}>
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          className={cn(
            "absolute flex flex-col justify-center gap-0.5 overflow-hidden px-2 text-white",
            !segment.continuesBefore && "rounded-l-md",
            !segment.continuesAfter && "rounded-r-md",
          )}
          style={{
            left: `${(segment.colStart / 5) * 100}%`,
            width: `${(segment.colSpan / 5) * 100}%`,
            top: rows[index] * (rowHeight + TRACK_GAP),
            height: rowHeight,
            backgroundColor: segment.color,
          }}
          title={[segment.label, segment.badgeText, segment.subLabel].filter(Boolean).join(" — ")}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[12px] font-medium leading-tight">{segment.label}</span>
            {segment.badgeText && (
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/70 px-1.5 py-[1px] text-[9px] leading-tight">
                {segment.badgeText}
              </span>
            )}
            {segment.link && (
              <a
                href={segment.link}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto shrink-0 text-white/90 hover:text-white"
                onClick={(e) => e.stopPropagation()}
                title="Open link"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          {segment.subLabel && <span className="truncate text-[10px] leading-tight opacity-90">{segment.subLabel}</span>}
        </div>
      ))}
    </div>
  );
}

interface MonthWeekRowProps {
  days: string[];
  monthAnchor: string;
  phaseEntries: PhaseBarEntry[];
  phaseTitles: PhaseTitle[];
  rjfBlocks: ScheduleBlock[];
  clientBlocks: ScheduleBlock[];
  /** The agency's own name, shown as the second line on every RJF block (e.g. "RunJumpFly"). */
  agencyName: string;
  /** This project's client name, shown as the second line on every Client block. */
  clientName: string;
}

/** "17:00-18:00  online" style badge text from a block's time/mode fields, or undefined if neither is set. */
function blockBadgeText(block: ScheduleBlock): string | undefined {
  const parts = [block.timeRange, block.mode].filter(Boolean);
  return parts.length > 0 ? parts.join("  ") : undefined;
}

/** The phase (if any) covering a given day, used to render the coloured date pill. */
function phaseForDay(phaseEntries: PhaseBarEntry[], day: string): PhaseBarEntry | undefined {
  return phaseEntries.find((p) => day >= p.startDate && day <= p.endDate);
}

export function MonthWeekRow({
  days,
  monthAnchor,
  phaseEntries,
  phaseTitles,
  rjfBlocks,
  clientBlocks,
  agencyName,
  clientName,
}: MonthWeekRowProps) {
  const phaseTitlesById = new Map(phaseTitles.map((t) => [t.id, t]));
  const rjfSegments = buildSegments(
    rjfBlocks,
    days,
    (b) => b.title || "(untitled)",
    (b) => b.color,
    blockBadgeText,
    () => agencyName,
  );
  const clientSegments = buildSegments(
    clientBlocks,
    days,
    (b) => b.title || "(untitled)",
    (b) => b.color,
    blockBadgeText,
    () => clientName,
    (b) => b.externalLink ?? undefined,
  );

  const rjfRows = Math.max(1, ...assignSegmentRows(rjfSegments).map((r) => r + 1));
  const clientRows = Math.max(1, ...assignSegmentRows(clientSegments).map((r) => r + 1));

  const rjfTop = DAY_NUMBER_HEIGHT + 2;
  const clientTop = rjfTop + rjfRows * (BLOCK_TRACK_ROW_HEIGHT + TRACK_GAP);
  const rowContentHeight = DAY_NUMBER_HEIGHT + (rjfRows + clientRows) * (BLOCK_TRACK_ROW_HEIGHT + TRACK_GAP) + 8;

  return (
    <div className="relative flex border-b border-r">
      {days.map((day) => {
        const holiday = getHolidayForDate(day);
        const inMonth = isDateInMonth(day, monthAnchor);
        const phaseEntry = phaseForDay(phaseEntries, day);
        const phaseTitle = phaseEntry ? phaseTitlesById.get(phaseEntry.phaseTitleId) : undefined;
        return (
          <div
            key={day}
            className={cn(
              "relative flex-1 border-l p-1",
              !inMonth && "bg-muted/40 opacity-50",
              holiday && "bg-[repeating-linear-gradient(45deg,theme(colors.muted.DEFAULT),theme(colors.muted.DEFAULT)_6px,transparent_6px,transparent_12px)]",
            )}
            style={{ minHeight: rowContentHeight }}
            title={holiday ? `${formatDisplayDate(day)} — ${holiday.name}` : formatDisplayDate(day)}
          >
            <div
              className="flex items-baseline gap-1 rounded px-1 py-0.5"
              style={phaseEntry ? { backgroundColor: phaseTitle?.color ?? "#94a3b8" } : undefined}
            >
              <span className={cn("shrink-0 text-xs font-medium", phaseEntry ? "text-white" : "text-muted-foreground")}>
                {day.slice(8, 10)}
              </span>
              {phaseEntry && (
                <span className="min-w-0 truncate text-[10px] font-medium text-white">
                  {phaseTitle?.label ?? "Unknown phase"}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-x-0 top-0">
        <TrackLayer segments={rjfSegments} trackTop={rjfTop} />
        <TrackLayer segments={clientSegments} trackTop={clientTop} />
      </div>
    </div>
  );
}
