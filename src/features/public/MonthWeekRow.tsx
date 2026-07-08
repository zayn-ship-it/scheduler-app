/**
 * MonthWeekRow.tsx
 * ---------------------------------------------------------------------------
 * One week (Mon-Sun) of the public month calendar. Renders the 7 day-number
 * cells as a background layer (dimmed if outside the current month,
 * cross-hatched/greyed if a public holiday falls on that day, lightly tinted
 * if it's a weekend), then overlays two stacked "tracks" spanning across
 * those columns: the RJF lane and the Client lane.
 *
 * Each day cell that falls inside a phase gets its date number + the phase's
 * title rendered together inside a small pill coloured with that phase
 * title's locked colour (set in Settings). Admins still drag/resize phase
 * date ranges the normal way in the back office's PhaseBar.tsx - this is
 * purely how the public view *displays* the result of that.
 *
 * A block that runs longer than this week (spans several weeks) is clipped
 * to just this row's Mon-Sun window via `clipRangeToRow` - the segment that
 * results loses its rounded corner on whichever side it was clipped, as a
 * visual cue that it continues into the neighbouring row.
 *
 * Each RJF/Client block renders as: a left-aligned title with its time/mode
 * "badge" and external link following it (wrapping onto its own line below
 * the title if there isn't room), then - if the "Show deliverables" toggle
 * is on - just its first information/deliverable line, with a "See more"
 * button if there's more than one. Clicking a block (or "See more") opens a
 * right-side detail drawer with the FULL information (including deliverable
 * data) regardless of the toggle - the toggle only declutters the compact
 * calendar preview, it never hides data from the drawer.
 */
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHolidayForDate } from "@/data/saPublicHolidays";
import { clipRangeToRow, isDateInMonth } from "@/lib/calendarUtils";
import { formatDisplayDate, fromIsoDate, todayIso } from "@/lib/dateUtils";
import type { Deliverable, PhaseBarEntry, PhaseTitle, ScheduleBlock } from "@/lib/storage/types";
import { getContrastTextColor, RJF_BLOCK_COLOR } from "@/features/schedule/colorPresets";
import { infoLines } from "@/features/schedule/deliverableFormat";
import { cn } from "@/lib/utils";

const DAY_NUMBER_HEIGHT = 24;
/** Minimum height for a block with no notes - just the title/badge line. */
const BLOCK_BASE_HEIGHT = 28;
const NOTE_LINE_HEIGHT = 16;
/** Vertical gap between the title line and each note line, and between notes themselves (matches the `gap-1` class below). */
const CONTENT_GAP = 4;
const TRACK_GAP = 3;
/** RJF/Client blocks never render shorter than this, even with no information lines. */
const MIN_BLOCK_HEIGHT = 48;

/** The link's display text: the block's custom title if set, otherwise a sensible default. */
function linkText(block: ScheduleBlock): string {
  return block.linkLabel || "Open meeting link";
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

/** The lines actually shown in the compact calendar preview - all of them when the toggle is on, none at all when it's off (the full detail, including deliverables, always remains in segment.lines for the drawer). */
function compactLines(segment: Segment, showDeliverables: boolean): string[] {
  return showDeliverables ? segment.lines : [];
}

/** How many lines actually render inline on the compact block: the first line, plus one more for "See more" if there's anything hidden behind it. */
function visibleLineCount(lines: string[]): number {
  if (lines.length === 0) return 0;
  return lines.length > 1 ? 2 : 1;
}

/** How tall a segment needs to be to fit its title line plus its visible info lines, un-truncated. */
function segmentHeight(segment: Segment, showDeliverables: boolean): number {
  return Math.max(MIN_BLOCK_HEIGHT, BLOCK_BASE_HEIGHT + visibleLineCount(compactLines(segment, showDeliverables)) * (NOTE_LINE_HEIGHT + CONTENT_GAP));
}

/** Assigns each segment a top offset + height: segments sharing a stacked row share that row's tallest height. */
function layoutSegments(segments: Segment[], showDeliverables: boolean): { tops: number[]; heights: number[]; totalHeight: number } {
  const rows = assignSegmentRows(segments);
  const rowHeights: number[] = [];
  segments.forEach((segment, index) => {
    const row = rows[index];
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, segmentHeight(segment, showDeliverables));
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

function BlockDetailContent({ block, lines }: { block: ScheduleBlock; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">
        {formatDisplayDate(block.startDate)}
        {block.endDate !== block.startDate && ` – ${formatDisplayDate(block.endDate)}`}
      </p>
      {(block.timeRange || block.mode) && (
        <p className="text-xs text-muted-foreground">{[block.timeRange, block.mode].filter(Boolean).join("  ")}</p>
      )}
      {lines.length > 0 && (
        <ul className="flex flex-col gap-1 text-base">
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
          <Icon name="link_2" size={12} />
          {linkText(block)}
        </a>
      )}
    </div>
  );
}

function TrackLayer({
  segments,
  trackTop,
  dayCount,
  showDeliverables,
}: {
  segments: Segment[];
  trackTop: number;
  dayCount: number;
  showDeliverables: boolean;
}) {
  const { tops, heights, totalHeight } = layoutSegments(segments, showDeliverables);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const openSegment = segments.find((s) => s.block.id === openBlockId);

  return (
    <div className="absolute inset-x-0" style={{ top: trackTop, height: totalHeight }}>
      {segments.map((segment, index) => {
        const { block } = segment;
        const lines = compactLines(segment, showDeliverables);
        // RJF never offers a colour choice - always render the brand black regardless of what's stored (covers older blocks saved before this was locked down).
        const displayColor = block.lane === "RJF" ? RJF_BLOCK_COLOR : block.color;
        const textColor = getContrastTextColor(displayColor);
        const isDarkText = textColor === RJF_BLOCK_COLOR;
        // A genuine start/end edge gets a small gap from the day boundary; an edge that continues across a row wrap stays flush.
        const leftInset = segment.continuesBefore ? 0 : 4;
        const rightInset = segment.continuesAfter ? 0 : 4;
        return (
          <div
            key={block.id}
            className={cn(
              "pointer-events-auto absolute flex cursor-pointer flex-col justify-center gap-1 overflow-hidden px-2 py-1",
              block.isDelay && "items-center gap-0.5 bg-gray-500 text-white",
              !segment.continuesBefore && "rounded-l-md",
              !segment.continuesAfter && "rounded-r-md",
            )}
            style={{
              left: `calc(${(segment.colStart / dayCount) * 100}% + ${leftInset}px)`,
              width: `calc(${(segment.colSpan / dayCount) * 100}% - ${leftInset + rightInset}px)`,
              top: tops[index],
              height: heights[index],
              backgroundColor: block.isDelay ? undefined : displayColor,
              color: block.isDelay ? undefined : textColor,
            }}
            onClick={() => setOpenBlockId(block.id)}
          >
            {block.isDelay ? (
              <>
                <Icon name="next_plan" size={18} />
                <span className="text-[10px] leading-tight text-gray-100">Delay</span>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="truncate text-left text-[14px] font-medium leading-tight">
                    {block.title || "(untitled)"}
                  </span>
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
                      <Icon name="link_2" size={12} />
                    </a>
                  )}
                </div>
                {lines.length > 0 && (
                  <span className="truncate text-[12px] leading-tight opacity-90">{lines[0]}</span>
                )}
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="w-fit truncate text-left text-[12px] leading-tight opacity-90 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBlockId(block.id);
                    }}
                  >
                    See more
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      <Sheet open={openSegment !== undefined} onOpenChange={(open) => !open && setOpenBlockId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{openSegment?.block.title || "(untitled)"}</SheetTitle>
          </SheetHeader>
          {openSegment && <BlockDetailContent block={openSegment.block} lines={openSegment.lines} />}
        </SheetContent>
      </Sheet>
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
  showDeliverables: boolean;
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
  showDeliverables,
}: MonthWeekRowProps) {
  const phaseTitlesById = new Map(phaseTitles.map((t) => [t.id, t]));
  // Always the full map - the "Show deliverables" toggle only affects the compact preview (see compactLines), never the drawer's data.
  const deliverablesById = new Map(deliverables.map((d) => [d.id, d]));
  const rjfSegments = buildSegments(rjfBlocks, days, deliverablesById);
  const clientSegments = buildSegments(clientBlocks, days, deliverablesById);

  const rjfLayout = layoutSegments(rjfSegments, showDeliverables);
  const clientLayout = layoutSegments(clientSegments, showDeliverables);

  const rjfTop = DAY_NUMBER_HEIGHT + 2;
  const clientTop = rjfTop + rjfLayout.totalHeight + TRACK_GAP;
  const rowContentHeight = clientTop + clientLayout.totalHeight + 8;

  return (
    <div className="relative flex border-b border-r">
      {days.map((day) => {
        const holiday = getHolidayForDate(day);
        const inMonth = isDateInMonth(day, monthAnchor);
        const isToday = day === todayIso();
        const dayOfWeek = fromIsoDate(day).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const phaseEntry = phaseForDay(phaseEntries, day);
        const phaseTitle = phaseEntry ? phaseTitlesById.get(phaseEntry.phaseTitleId) : undefined;
        return (
          <div
            key={day}
            className={cn(
              "relative min-w-0 flex-1 border-l p-1",
              isWeekend && "bg-muted/40",
              !inMonth && "bg-muted/40 opacity-50",
              isToday && "bg-muted",
              holiday && "bg-[repeating-linear-gradient(45deg,theme(colors.muted.DEFAULT),theme(colors.muted.DEFAULT)_6px,transparent_6px,transparent_12px)]",
            )}
            style={{ minHeight: rowContentHeight }}
            title={holiday ? `${formatDisplayDate(day)} — ${holiday.name}` : formatDisplayDate(day)}
          >
            <div
              className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5"
              style={phaseEntry ? { backgroundColor: phaseTitle?.color ?? "#94a3b8" } : undefined}
            >
              {isToday && <span className="size-2 shrink-0 rounded-full bg-red-500" />}
              <span className={cn("shrink-0 text-xs font-medium", phaseEntry ? "text-foreground" : "text-muted-foreground")}>
                {day.slice(8, 10)}
              </span>
              {phaseEntry && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="min-w-0 truncate text-[11px] font-medium text-foreground">
                      {phaseTitle?.label ?? "Unknown phase"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDisplayDate(day)} — {phaseTitle?.label ?? "Unknown phase"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-x-0 top-0">
        <TrackLayer segments={rjfSegments} trackTop={rjfTop} dayCount={days.length} showDeliverables={showDeliverables} />
        <TrackLayer segments={clientSegments} trackTop={clientTop} dayCount={days.length} showDeliverables={showDeliverables} />
      </div>
    </div>
  );
}
