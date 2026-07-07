/**
 * ScheduleGrid.tsx
 * ---------------------------------------------------------------------------
 * The main timeline: a single continuous horizontal (scrollable) grid
 * bounded to the project's own start/end dates - never a full year, and
 * never wrapped into weekly rows (see BRS.md / plan notes for why a
 * continuous timeline was chosen over replicating the old spreadsheet's
 * weekly-page layout: it keeps every block a single contiguous element,
 * which is what makes the drag/resize math in useBlockDragResize.ts simple).
 *
 * Row order, top to bottom: day headers, public holidays, phase bar, then
 * one LaneRow per lane (RJF, Suppliers, Internal, Client, Leave Tracker).
 */
import { useMemo } from "react";
import { enumerateDays } from "@/lib/dateUtils";
import { LANE_ORDER, type Project } from "@/lib/storage/types";
import { DayColumnHeader } from "./DayColumnHeader";
import { PublicHolidayRow } from "./PublicHolidayRow";
import { PhaseBar } from "./PhaseBar";
import { LaneRow } from "./LaneRow";

interface ScheduleGridProps {
  project: Project;
  readOnly: boolean;
  /** Called after any mutation (block/phase add/edit/delete/drag) so the parent can re-read the project from storage. */
  onProjectChanged: () => void;
}

export function ScheduleGrid({ project, readOnly, onProjectChanged }: ScheduleGridProps) {
  const days = useMemo(() => enumerateDays(project.startDate, project.endDate), [project.startDate, project.endDate]);
  const bounds = { startDate: project.startDate, endDate: project.endDate };

  const blocksByLane = useMemo(() => {
    const map = new Map<string, typeof project.blocks>();
    for (const lane of LANE_ORDER) map.set(lane, []);
    for (const block of project.blocks) {
      map.get(block.lane)?.push(block);
    }
    return map;
  }, [project.blocks]);

  if (days.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        This project's end date is before its start date - fix the date range above to see the schedule grid.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="inline-block min-w-full">
        <DayColumnHeader days={days} />
        <PublicHolidayRow days={days} />
        <PhaseBar
          projectId={project.id}
          days={days}
          entries={project.phaseBarEntries}
          readOnly={readOnly}
          onProjectChanged={onProjectChanged}
        />
        {LANE_ORDER.map((lane) => (
          <LaneRow
            key={lane}
            projectId={project.id}
            lane={lane}
            blocks={blocksByLane.get(lane) ?? []}
            deliverables={project.deliverables}
            days={days}
            bounds={bounds}
            readOnly={readOnly}
            onProjectChanged={onProjectChanged}
          />
        ))}
      </div>
    </div>
  );
}
