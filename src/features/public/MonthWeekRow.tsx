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
 * the same first line, then a list of "information" lines underneath - its
 * own free-text lines plus any deliverables attached to it (with their
 * duration/aspect ratio/qty appended) - one below another. The block's row
 * height grows to fit however many lines it has rather than truncating them.
 * Hovering a block also opens a HoverCard with the full detail (title,
 * dates, time, mode, link, information).
 */
import { ExternalLink } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getHolidayForDate } from "@/data/saPublicHolidays";
import { clipRangeToRow, isDateInMonth } from "@/lib/calendarUtils";
import { formatDisplayDate } from "@/lib/dateUtils";
import type { Deliverable, PhaseBarEntry, PhaseTitle, ScheduleBlock } from "@/lib/storage/types";
import { getContrastTextColor } from "@/features/schedule/colorPresets";
import { cn } from "@/lib/utils";

const DAY_NUMBER_HEIGHT = 24;
/** Minimum height for a block with no notes - just the title/badge line. */
const BLOCK_BASE_HEIGHT = 24;
const NOTE_LINE_HEIGHT = 13;
/** Vertical gap between the title line and each note line, and between notes themselves (matches the `gap-1` class below). */
const CONTENT_GAP = 4;
const TRACK_GAP = 3;

/** The link's display text: the block's custom title if set, otherwise a sensible default. */
function linkText(block: ScheduleBlock): string {
  return block.linkLabel || "Open meeting link";
}

/** A deliverable rendered as a single line, e.g. "WEB001 — Squeeze Page · 30s · 16:9 · Qty 2". */
function deliverableLine(deliverable: Deliverable): string {
  const label = [deliverable.identifier, deliverable.description].filter(Boolean).join(" — ");
  const meta = [deliverable.duration, deliverable.aspectRatio, `Qty ${deliverable.qty}`].filter(Boolean).join(" · ");
  return meta ? `${label} · ${meta}` : label;
}

/** A block's combined information: its own free-text lines, then each attached deliverable as its own line. */
function infoLines(block: ScheduleBlock, deliverablesById: Map<string, Deliverable>): string[] {
  const attached = block.deliverableIds
    .map((id) => deliverablesById.get(id))
    .filter((d): d is Deliverable => Boolean(d))
    .map(deliverableLine);
  return [...block.information, ...attached];
}

interface Segment {
  block: ScheduleBlock;
  lines: string[];
  colStart: number;
  colSpan: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** Clips a lane's blocks to this row and converts them into column-indexed segments. */
function buildSegments(blocks: ScheduleBlock[], days: string[], deliverablesById: Map<string, Deliverable>): Segment[] {
  const segments: Segment[] = [];
  for (const block of blocks) {
    const clipped = clipRangeToRow(block.startDate, block.endDate, days[0], days[days.length - 1]);
    if (!clipped) continue;
    const colStart = days.indexOf(clipped.start);
    const colEnd = days.indexOf(clipped.end);
    segments.push({
      block,
      lines: infoLines(block, deliverablesById),
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

/** How tall a segment needs to be to fit its title line plus one line per info line, un-truncated. */
function segmentHeight(segment: Segment): number {
  return BLOCK_BASE_HEIGHT + segment.lines.length * (NOTE_LINE_HEIGHT + CONTENT_GAP);
}

/** Assigns each segment a top offset + height: segments sharing a stacked row share that row's tallest height. */
function layoutSegments(segments: Segment[]): { tops: number[]; heights: number[]; totalHeight: number } {
  const rows = assignSegmentRows(segments);
  const rowHeights: number[] = [];
  segments.forEach((segment, index) => {
    const row = rows[index];
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, segmentHeight(segment));
  });

  const rowTops: number[] = [];
  let acc = 0;
  for (let row = 0; row < rowHeights.length; row++) {
    rowTops[row] = acc;
    acc += rowHeights[row] + TRACK_GAP;
  }

  const tops = rows.map((row) => rowTops[row]);
  const heights = rows.map((row) => rowHeights[row]);
  const totalHeight = Math.max(rowHeights.length > 0 ? acc - TRACK_GAP : 0, BLOCK_BASE_HEIGHT);

  return { tops, heights, totalHeight };
}

/** "17:00-18:00  online" style badge text from a block's time/mode fields, or undefined if neither is set. */
function blockBadgeText(block: ScheduleBlock): string | undefined {
  const parts = [block.timeRange, block.mode].filter(Boolean);
  return parts.length > 0 ? parts.join("  ") : undefined;
}

function BlockHoverCardContent({ block, lines }: { block: ScheduleBlock; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-semibold leading-tight">{block.title || "(untitled)"}</p>
      <p className="text-xs text-muted-foreground">
        {formatDisplayDate(block.startDate)}
        {block.endDate !== block.startDate && ` – ${formatDisplayDate(block.endDate)}`}
      </p>
      {(block.timeRange || block.mode) && (
        <p className="text-xs text-muted-foreground">{[block.timeRange, block.mode].filter(Boolean).join("  ")}</p>
      )}
      {lines.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs">
          {lines.map((line, i) => (
            <li key={i}>- {line}</li>
          ))}
        </ul>
      )}
      {block.externalLink && (
        <a
          href={block.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary underline"
        >
          <ExternalLink className="size-3" />
          {linkText(block)}
        </a>
      )}
    </div>
  );
}

function TrackLayer({ segments, trackTop }: { segments: Segment[]; trackTop: number }) {
  const { tops, heights, totalHeight } = layoutSegments(segments);

  return (
    <div className="absolute inset-x-0" style={{ top: trackTop, height: totalHeight }}>
      {segments.map((segment, index) => {
        const { block } = segment;
        const textColor = getContrastTextColor(block.color);
        const isDarkText = textColor === "#0f172a";
        return (
          <HoverCard key={block.id} openDelay={150}>
            <HoverCardTrigger asChild>
              <div
                className={cn(
                  "pointer-events-auto absolute flex flex-col gap-1 overflow-hidden px-2 py-1",
                  !segment.continuesBefore && "rounded-l-md",
                  !segment.continuesAfter && "rounded-r-md",
                )}
                style={{
                  left: `${(segment.colStart / 5) * 100}%`,
                  width: `${(segment.colSpan / 5) * 100}%`,
                  top: tops[index],
                  height: heights[index],
                  backgroundColor: block.color,
                  color: textColor,
                }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium leading-tight">{block.title || "(untitled)"}</span>
                  {blockBadgeText(block) && (
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[9px] leading-tight",
                        isDarkText ? "border-foreground/40" : "border-white/70",
                      )}
                    >
                      {blockBadgeText(block)}
                    </span>
                  )}
                  {block.externalLink && (
                    <a
                      href={block.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("shrink-0", isDarkText ? "text-foreground/80 hover:text-foreground" : "text-white/90 hover:text-white")}
                      onClick={(e) => e.stopPropagation()}
                      title={linkText(block)}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                {segment.lines.map((line, i) => (
                  <span key={i} className="truncate text-[10px] leading-tight opacity-90">
                    {line}
                  </span>
                ))}
              </div>
            </HoverCardTrigger>
            <HoverCardContent>
              <BlockHoverCardContent block={block} lines={segment.lines} />
            </HoverCardContent>
          </HoverCard>
        );
      })}
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
  deliverables: Deliverable[];
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
  deliverables,
}: MonthWeekRowProps) {
  const phaseTitlesById = new Map(phaseTitles.map((t) => [t.id, t]));
  const deliverablesById = new Map(deliverables.map((d) => [d.id, d]));
  const rjfSegments = buildSegments(rjfBlocks, days, deliverablesById);
  const clientSegments = buildSegments(clientBlocks, days, deliverablesById);

  const rjfLayout = layoutSegments(rjfSegments);
  const clientLayout = layoutSegments(clientSegments);

  const rjfTop = DAY_NUMBER_HEIGHT + 2;
  const clientTop = rjfTop + rjfLayout.totalHeight + TRACK_GAP;
  const rowContentHeight = clientTop + clientLayout.totalHeight + 8;

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
