/**
 * PeopleWorkloadView.tsx
 * ---------------------------------------------------------------------------
 * Tab 1 of the Projects-page Dashboard drawer: a cross-project "who's
 * working on what" timeline. Every schedule block (from every project) that
 * has a `personId` set gets grouped into that person's row - unlike
 * PublicWeekView.tsx (one project, lanes = RJF/Client), here the rows are
 * people and the columns span whatever date range their combined assigned
 * work covers, always including today.
 *
 * Deliberately simpler than PublicWeekView.tsx's LaneTrack: there's no delay
 * marker/phase-row/deliverables-drawer concept here, so row heights are a
 * flat constant instead of the variable per-row heights that view needs.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_COLUMN_WIDTH_PX, LANE_LABEL_WIDTH_PX } from "@/features/schedule/gridConstants";
import { defaultPersonColor, getContrastTextColor, PHASE_COLOR_PRESETS } from "@/features/schedule/colorPresets";
import { updatePerson } from "@/lib/storage/peopleRepository";
import { dayIndex, enumerateDays, formatDisplayDate, fromIsoDate, spanLengthDays, todayIso } from "@/lib/dateUtils";
import type { Person, Project, ScheduleBlock } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const ROW_HEIGHT_PX = 48;

interface Assignment {
  project: Project;
  block: ScheduleBlock;
}

/** Greedily assigns each assignment a stacking row index so no two overlapping ones (by date) share a row - same recipe as PublicWeekView.tsx's assignRows, generalized off block.startDate/endDate. */
function assignRows(assignments: Assignment[]): Map<string, number> {
  const sorted = [...assignments].sort((a, b) => a.block.startDate.localeCompare(b.block.startDate));
  const rowEndDates: string[] = [];
  const rowIndexByBlockId = new Map<string, number>();

  for (const { block } of sorted) {
    let row = rowEndDates.findIndex((endDate) => endDate < block.startDate);
    if (row === -1) {
      row = rowEndDates.length;
      rowEndDates.push(block.endDate);
    } else {
      rowEndDates[row] = block.endDate;
    }
    rowIndexByBlockId.set(block.id, row);
  }
  return rowIndexByBlockId;
}

function rowCount(rowAssignment: Map<string, number>): number {
  return Math.max(1, ...Array.from(rowAssignment.values()).map((r) => r + 1));
}

function PersonRow({
  person,
  assignments,
  days,
  color,
  onColorChange,
}: {
  person: Person;
  assignments: Assignment[];
  days: string[];
  color: string;
  onColorChange: (color: string) => void;
}) {
  const rowAssignment = assignRows(assignments);
  const trackHeight = rowCount(rowAssignment) * ROW_HEIGHT_PX;
  const textColor = getContrastTextColor(color);

  return (
    <div className="flex border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 flex-col gap-1.5 border-r bg-background px-2 py-2"
        style={{ width: LANE_LABEL_WIDTH_PX }}
      >
        <span className="truncate text-xs font-semibold">{person.name}</span>
        <Select value={color} onValueChange={onColorChange}>
          <SelectTrigger className="h-7 w-full text-xs" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHASE_COLOR_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: preset.value }} />
                  {preset.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative" style={{ width: days.length * DAY_COLUMN_WIDTH_PX, height: trackHeight }}>
        {assignments.map(({ project, block }) => {
          const startIdx = Math.max(dayIndex(days, block.startDate), 0);
          const span = spanLengthDays(block.startDate, block.endDate);
          const rowIndex = rowAssignment.get(block.id) ?? 0;
          const blockWidth = span * DAY_COLUMN_WIDTH_PX - 4;
          const dateRange =
            block.startDate === block.endDate
              ? formatDisplayDate(block.startDate)
              : `${formatDisplayDate(block.startDate)} – ${formatDisplayDate(block.endDate)}`;
          const isLeave = block.lane === "LEAVE_TRACKER";

          return (
            <div
              key={block.id}
              className={cn(
                "absolute flex flex-col justify-center gap-0.5 rounded-md py-1",
                isLeave &&
                  "items-center bg-[repeating-linear-gradient(45deg,theme(colors.muted.DEFAULT),theme(colors.muted.DEFAULT)_6px,transparent_6px,transparent_12px)] text-foreground",
              )}
              style={{
                left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
                width: blockWidth,
                top: rowIndex * ROW_HEIGHT_PX + 2,
                height: ROW_HEIGHT_PX - 4,
                backgroundColor: isLeave ? undefined : color,
                color: isLeave ? undefined : textColor,
              }}
              title={isLeave ? `Leave (${dateRange})` : `${project.projectName || "Untitled Project"} — ${block.title || "(untitled)"} (${dateRange})`}
            >
              {isLeave ? (
                <span className="truncate px-2 text-[13px] font-medium leading-tight">Leave</span>
              ) : (
                <>
                  <span
                    className="block self-start truncate px-2 text-left text-[13px] font-medium leading-tight"
                    style={{ position: "sticky", left: LANE_LABEL_WIDTH_PX, maxWidth: blockWidth }}
                  >
                    {project.projectName || "Untitled Project"}
                  </span>
                  <span
                    className="block self-start truncate px-2 text-left text-[11px] leading-tight opacity-90"
                    style={{ position: "sticky", left: LANE_LABEL_WIDTH_PX, maxWidth: blockWidth }}
                  >
                    {block.title || "(untitled)"}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeopleWorkloadView({
  projects,
  people,
  onPersonColorChanged,
}: {
  projects: Project[];
  people: Person[];
  onPersonColorChanged: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});

  const assignmentsByPerson = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const project of projects) {
      for (const block of project.blocks) {
        if (block.isDelay || !block.personId) continue;
        const list = map.get(block.personId) ?? [];
        list.push({ project, block });
        map.set(block.personId, list);
      }
    }
    return map;
  }, [projects]);

  // Only people with at least one assignment, in the same order getPeople() already returns (alphabetical).
  const assignedPeople = people.filter((person) => (assignmentsByPerson.get(person.id) ?? []).length > 0);

  // The day range spans every assignment's dates, widened if necessary so today always falls inside it.
  const days = useMemo(() => {
    const today = todayIso();
    let min = today;
    let max = today;
    for (const assignments of assignmentsByPerson.values()) {
      for (const { block } of assignments) {
        if (block.startDate < min) min = block.startDate;
        if (block.endDate > max) max = block.endDate;
      }
    }
    return enumerateDays(min, max);
  }, [assignmentsByPerson]);

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

  async function handleColorChange(person: Person, color: string) {
    setColorOverrides((prev) => ({ ...prev, [person.id]: color }));
    await updatePerson({ ...person, color });
    onPersonColorChanged();
  }

  if (assignedPeople.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nobody has been assigned to any schedule blocks yet.
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

        {assignedPeople.map((person, index) => (
          <PersonRow
            key={person.id}
            person={person}
            assignments={assignmentsByPerson.get(person.id) ?? []}
            days={days}
            color={colorOverrides[person.id] ?? person.color ?? defaultPersonColor(index)}
            onColorChange={(color) => handleColorChange(person, color)}
          />
        ))}
      </div>
    </div>
  );
}
