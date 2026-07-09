/**
 * ProjectPhasesView.tsx
 * ---------------------------------------------------------------------------
 * Tab 2 of the Projects-page Dashboard drawer: a bird's-eye view of where
 * every project currently sits in its own phase timeline. Rows are projects
 * instead of people (see PeopleWorkloadView.tsx), and each row has two
 * stacked swimlanes: that project's phaseBarEntries on top (colored/labelled
 * from the same centrally-managed PhaseTitle a project's own live-link
 * schedule already uses, so a phase reads the same everywhere it appears),
 * and its Client-lane blocks below - always a fixed neutral color regardless
 * of project/phase, since this second lane is just "what's the client doing"
 * at a glance, not something that needs its own color identity.
 */
import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "@/features/schedule/gridConstants";
import { dayIndex, enumerateDays, formatDisplayDate, fromIsoDate, spanLengthDays, todayIso } from "@/lib/dateUtils";
import type { PhaseBarEntry, PhaseTitle, Project, ScheduleBlock } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const ROW_HEIGHT_PX = 48;

interface PhaseAssignment {
  project: Project;
  entry: PhaseBarEntry;
}

/** Greedily assigns each item a stacking row index (by id) so no two overlapping ones (by date) share a row - shared recipe for both the phase swimlane and the client-block swimlane below it. */
function assignRows<T extends { id: string; startDate: string; endDate: string }>(items: T[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const rowEndDates: string[] = [];
  const rowIndexById = new Map<string, number>();

  for (const item of sorted) {
    let row = rowEndDates.findIndex((endDate) => endDate < item.startDate);
    if (row === -1) {
      row = rowEndDates.length;
      rowEndDates.push(item.endDate);
    } else {
      rowEndDates[row] = item.endDate;
    }
    rowIndexById.set(item.id, row);
  }
  return rowIndexById;
}

function rowCount(rowAssignment: Map<string, number>): number {
  return Math.max(1, ...Array.from(rowAssignment.values()).map((r) => r + 1));
}

function ProjectRow({
  project,
  phaseAssignments,
  clientBlocks,
  days,
  phaseTitlesById,
}: {
  project: Project;
  phaseAssignments: PhaseAssignment[];
  clientBlocks: ScheduleBlock[];
  days: string[];
  phaseTitlesById: Map<string, PhaseTitle>;
}) {
  const phaseRowAssignment = assignRows(phaseAssignments.map((a) => a.entry));
  const phaseTrackHeight = rowCount(phaseRowAssignment) * ROW_HEIGHT_PX;

  const clientRowAssignment = assignRows(clientBlocks);
  const clientTrackHeight = clientBlocks.length > 0 ? rowCount(clientRowAssignment) * ROW_HEIGHT_PX : 0;

  const totalHeight = phaseTrackHeight + clientTrackHeight;

  return (
    <div className="flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 py-2"
        style={{ width: LANE_LABEL_WIDTH_PX, height: totalHeight }}
      >
        <span className="truncate text-xs font-semibold">{project.projectName || "Untitled Project"}</span>
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: totalHeight }}>
        {phaseAssignments.map(({ entry }) => {
          const startIdx = Math.max(dayIndex(days, entry.startDate), 0);
          const span = spanLengthDays(entry.startDate, entry.endDate);
          const rowIndex = phaseRowAssignment.get(entry.id) ?? 0;
          const entryWidth = span * DAY_COLUMN_WIDTH_PX - 4;
          const title = phaseTitlesById.get(entry.phaseTitleId);
          const dateRange =
            entry.startDate === entry.endDate
              ? formatDisplayDate(entry.startDate)
              : `${formatDisplayDate(entry.startDate)} – ${formatDisplayDate(entry.endDate)}`;

          return (
            <div
              key={entry.id}
              className="absolute flex items-center rounded-md"
              style={{
                left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
                width: entryWidth,
                top: rowIndex * ROW_HEIGHT_PX + 2,
                height: ROW_HEIGHT_PX - 4,
                backgroundColor: title?.color ?? "#94a3b8",
              }}
              title={`${title?.label ?? "Unknown phase"} (${dateRange})`}
            >
              <span
                className="truncate px-2 text-[11px] font-medium text-foreground"
                style={{ position: "sticky", left: LANE_LABEL_WIDTH_PX, maxWidth: entryWidth }}
              >
                {title?.label ?? "Unknown phase"}
              </span>
            </div>
          );
        })}

        {clientBlocks.map((block) => {
          const startIdx = Math.max(dayIndex(days, block.startDate), 0);
          const span = spanLengthDays(block.startDate, block.endDate);
          const rowIndex = clientRowAssignment.get(block.id) ?? 0;
          const blockWidth = span * DAY_COLUMN_WIDTH_PX - 4;
          const dateRange =
            block.startDate === block.endDate
              ? formatDisplayDate(block.startDate)
              : `${formatDisplayDate(block.startDate)} – ${formatDisplayDate(block.endDate)}`;

          return (
            <div
              key={block.id}
              className="absolute flex items-center rounded-md bg-neutral-400"
              style={{
                left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
                width: blockWidth,
                top: phaseTrackHeight + rowIndex * ROW_HEIGHT_PX + 2,
                height: ROW_HEIGHT_PX - 4,
              }}
              title={`${block.title || "(untitled)"} (${dateRange})`}
            >
              <span
                className="truncate px-2 text-[13px] font-medium text-black"
                style={{ position: "sticky", left: LANE_LABEL_WIDTH_PX, maxWidth: blockWidth }}
              >
                {block.title || "(untitled)"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectPhasesView({
  projects,
  phaseTitles,
}: {
  projects: Project[];
  phaseTitles: PhaseTitle[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const phaseTitlesById = useMemo(() => new Map(phaseTitles.map((t) => [t.id, t])), [phaseTitles]);

  const phaseAssignmentsByProject = useMemo(() => {
    const map = new Map<string, PhaseAssignment[]>();
    for (const project of projects) {
      if (project.phaseBarEntries.length === 0) continue;
      map.set(
        project.id,
        project.phaseBarEntries.map((entry) => ({ project, entry })),
      );
    }
    return map;
  }, [projects]);

  const clientBlocksByProject = useMemo(() => {
    const map = new Map<string, ScheduleBlock[]>();
    for (const project of projects) {
      const blocks = project.blocks.filter((b) => b.lane === "CLIENT" && !b.isDelay);
      if (blocks.length === 0) continue;
      map.set(project.id, blocks);
    }
    return map;
  }, [projects]);

  // A project shows up if it has phases configured, Client blocks, or both.
  const visibleProjects = projects.filter(
    (project) =>
      (phaseAssignmentsByProject.get(project.id) ?? []).length > 0 ||
      (clientBlocksByProject.get(project.id) ?? []).length > 0,
  );

  // The day range spans every phase entry's and Client block's dates, widened if necessary so today always falls inside it.
  const days = useMemo(() => {
    const today = todayIso();
    let min = today;
    let max = today;
    for (const assignments of phaseAssignmentsByProject.values()) {
      for (const { entry } of assignments) {
        if (entry.startDate < min) min = entry.startDate;
        if (entry.endDate > max) max = entry.endDate;
      }
    }
    for (const blocks of clientBlocksByProject.values()) {
      for (const block of blocks) {
        if (block.startDate < min) min = block.startDate;
        if (block.endDate > max) max = block.endDate;
      }
    }
    return enumerateDays(min, max);
  }, [phaseAssignmentsByProject, clientBlocksByProject]);

  // Default scroll position: today's column near the left edge.
  useEffect(() => {
    if (days.length === 0 || !scrollRef.current) return;
    const idx = dayIndex(days, todayIso());
    if (idx < 0) return;
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: idx * DAY_COLUMN_WIDTH_PX, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  if (visibleProjects.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No projects have any phases or Client blocks configured yet.
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full snap-x snap-mandatory overflow-auto rounded-md border"
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

        {visibleProjects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            phaseAssignments={phaseAssignmentsByProject.get(project.id) ?? []}
            clientBlocks={clientBlocksByProject.get(project.id) ?? []}
            days={days}
            phaseTitlesById={phaseTitlesById}
          />
        ))}
      </div>
    </div>
  );
}
