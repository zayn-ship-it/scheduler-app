/**
 * PublicWeekView.tsx
 * ---------------------------------------------------------------------------
 * Alternate live-link view: a continuous, horizontally-scrollable day-by-day
 * timeline covering the project's full startDate..endDate (like the back
 * office's own ScheduleGrid/LaneRow/PhaseBar, but read-only and public-
 * facing), as opposed to the month-grid calendar in PublicMonthCalendar.tsx.
 *
 * Rows top to bottom: a date header (weekday letter + day number, today's
 * number in a red circle), a 24px phase strip, then the RJF and Client lanes
 * at a fixed 48px row height each (overlapping blocks stack into extra 48px
 * rows via the same greedy interval assignment LaneRow.tsx uses). Horizontal
 * scrolling uses native CSS scroll-snap so releasing a drag/scroll settles
 * ("magnetizes") on the nearest day-column edge - no JS needed for that part.
 *
 * A block shows just its title; if it has any information/deliverable line
 * (and the "Show deliverables" toggle is on), a "See more" button opens the
 * same right-side detail drawer pattern used by the month view - the drawer
 * always shows full detail regardless of that toggle.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "@/features/schedule/gridConstants";
import { getContrastTextColor, RJF_BLOCK_COLOR } from "@/features/schedule/colorPresets";
import { infoLines } from "@/features/schedule/deliverableFormat";
import { getPhaseTitles } from "@/lib/storage/phaseTitleRepository";
import { dayIndex, enumerateDays, formatDisplayDate, fromIsoDate, spanLengthDays, todayIso } from "@/lib/dateUtils";
import type { Deliverable, PhaseTitle, Project, ScheduleBlock } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const WEEK_ROW_HEIGHT_PX = 48;
const PHASE_ROW_HEIGHT_PX = 24;

/** Greedily assigns each block a stacking row index such that no two overlapping blocks share a row (same approach as LaneRow.tsx). */
function assignRows(blocks: ScheduleBlock[]): Map<string, number> {
  const sorted = [...blocks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const rowEndDates: string[] = [];
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
          {block.linkLabel || "Open meeting link"}
        </a>
      )}
    </div>
  );
}

function LaneTrack({
  label,
  blocks,
  days,
  deliverablesById,
  showDeliverables,
  onOpenBlock,
}: {
  label: string;
  blocks: ScheduleBlock[];
  days: string[];
  deliverablesById: Map<string, Deliverable>;
  showDeliverables: boolean;
  onOpenBlock: (id: string) => void;
}) {
  const rowAssignment = assignRows(blocks);
  const rowCount = Math.max(1, ...Array.from(rowAssignment.values()).map((r) => r + 1));
  const trackHeight = rowCount * WEEK_ROW_HEIGHT_PX;

  return (
    <div className="flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 py-2 text-xs font-semibold"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        {label}
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: trackHeight }}>
        {blocks.map((block) => {
          const startIdx = Math.max(dayIndex(days, block.startDate), 0);
          const span = spanLengthDays(block.startDate, block.endDate);
          const displayColor = block.lane === "RJF" ? RJF_BLOCK_COLOR : block.color;
          const textColor = getContrastTextColor(displayColor);
          const lines = showDeliverables ? infoLines(block, deliverablesById) : [];
          const rowIndex = rowAssignment.get(block.id) ?? 0;

          return (
            <div
              key={block.id}
              className="absolute flex cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-md px-2 py-1"
              style={{
                left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
                width: span * DAY_COLUMN_WIDTH_PX - 4,
                top: rowIndex * WEEK_ROW_HEIGHT_PX + 2,
                height: WEEK_ROW_HEIGHT_PX - 4,
                backgroundColor: displayColor,
                color: textColor,
              }}
              onClick={() => onOpenBlock(block.id)}
            >
              <span className="truncate text-left text-[13px] font-medium leading-tight">
                {block.title || "(untitled)"}
              </span>
              {lines.length > 0 && (
                <button
                  type="button"
                  className="w-fit truncate text-left text-[11px] leading-tight opacity-90 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBlock(block.id);
                  }}
                >
                  See more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicWeekView({
  project,
  showDeliverables,
}: {
  project: Project;
  showDeliverables: boolean;
}) {
  const [phaseTitles, setPhaseTitles] = useState<PhaseTitle[]>([]);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPhaseTitles().then(setPhaseTitles);
  }, []);

  const days = useMemo(() => enumerateDays(project.startDate, project.endDate), [project.startDate, project.endDate]);
  const phaseTitlesById = new Map(phaseTitles.map((t) => [t.id, t]));
  const deliverablesById = new Map(project.deliverables.map((d) => [d.id, d]));
  const rjfBlocks = project.blocks.filter((b) => b.lane === "RJF");
  const clientBlocks = project.blocks.filter((b) => b.lane === "CLIENT");
  const allBlocksById = new Map(project.blocks.map((b) => [b.id, b]));
  const openBlock = openBlockId ? allBlocksById.get(openBlockId) : undefined;
  const openLines = openBlock ? infoLines(openBlock, deliverablesById) : [];

  // Default scroll position: today's column near the left edge, clamped into the project's own range.
  useEffect(() => {
    if (days.length === 0 || !scrollRef.current) return;
    const target = todayIso() < days[0] ? days[0] : todayIso() > days[days.length - 1] ? days[days.length - 1] : todayIso();
    const idx = dayIndex(days, target);
    if (idx < 0) return;
    // Deferred to the next frame so the browser has settled scroll-snap/layout before we set the position - otherwise it can visually settle one column off.
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: idx * DAY_COLUMN_WIDTH_PX, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  if (days.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        This project's end date is before its start date - there's nothing to show.
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="snap-x snap-mandatory overflow-x-auto rounded-md border"
      style={{ scrollPaddingLeft: LANE_LABEL_WIDTH_PX }}
    >
      <div className="inline-block min-w-full">
        {/* Date header row */}
        <div className="flex border-b bg-background">
          <div className="sticky left-0 z-20 shrink-0 border-r bg-background" style={{ width: LANE_LABEL_WIDTH_PX }} />
          {days.map((day) => {
            const isToday = day === todayIso();
            const isWeekend = [0, 6].includes(fromIsoDate(day).getDay());
            return (
              <div
                key={day}
                className={cn(
                  "flex shrink-0 snap-start items-center justify-center gap-1 border-r py-2 text-xs font-medium",
                  isWeekend && "bg-muted/40",
                  isToday && "bg-muted",
                )}
                style={{ width: DAY_COLUMN_WIDTH_PX }}
                title={formatDisplayDate(day)}
              >
                <span className="text-muted-foreground">{format(fromIsoDate(day), "EEEEE")}</span>
                {isToday ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
                    {day.slice(8, 10)}
                  </span>
                ) : (
                  <span className="text-foreground">{day.slice(8, 10)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Phase row */}
        <div className="relative flex border-b">
          <div
            className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 text-xs font-semibold text-muted-foreground"
            style={{ width: LANE_LABEL_WIDTH_PX }}
          >
            Phase
          </div>
          <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: PHASE_ROW_HEIGHT_PX }}>
            {project.phaseBarEntries.map((entry) => {
              const startIdx = Math.max(dayIndex(days, entry.startDate), 0);
              const endIdx = dayIndex(days, entry.endDate);
              const clampedEnd = endIdx === -1 ? days.length - 1 : endIdx;
              if (clampedEnd < startIdx) return null;
              const title = phaseTitlesById.get(entry.phaseTitleId);
              return (
                <div
                  key={entry.id}
                  className="absolute top-0 flex items-center justify-center truncate rounded px-2 text-[11px] font-medium text-foreground"
                  style={{
                    left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
                    width: (clampedEnd - startIdx + 1) * DAY_COLUMN_WIDTH_PX - 4,
                    height: PHASE_ROW_HEIGHT_PX,
                    backgroundColor: title?.color ?? "#94a3b8",
                  }}
                  title={title?.label ?? "Unknown phase"}
                >
                  {title?.label ?? "Unknown phase"}
                </div>
              );
            })}
          </div>
        </div>

        <LaneTrack
          label="RJF"
          blocks={rjfBlocks}
          days={days}
          deliverablesById={deliverablesById}
          showDeliverables={showDeliverables}
          onOpenBlock={setOpenBlockId}
        />
        <LaneTrack
          label="Client"
          blocks={clientBlocks}
          days={days}
          deliverablesById={deliverablesById}
          showDeliverables={showDeliverables}
          onOpenBlock={setOpenBlockId}
        />
      </div>

      <Sheet open={openBlock !== undefined} onOpenChange={(open) => !open && setOpenBlockId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{openBlock?.title || "(untitled)"}</SheetTitle>
          </SheetHeader>
          {openBlock && <BlockDetailContent block={openBlock} lines={openLines} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
