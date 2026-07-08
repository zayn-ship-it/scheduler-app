/**
 * PublicMonthCalendar.tsx
 * ---------------------------------------------------------------------------
 * The client-facing schedule view: a traditional month calendar grid
 * (Mon-Sun, weekends included as columns), showing only
 * the RJF and Client lanes plus the Phase bar. Suppliers/Internal/Leave
 * Tracker blocks are intentionally never read by this component - those
 * lanes are for internal visibility only (see the back office's
 * ScheduleGrid, which still shows all 5 lanes to admins).
 *
 * Own the "which month is currently visible" state and prev/next
 * navigation, clamped to the project's own date range so a client can't
 * page into months with nothing in them.
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  addMonths,
  formatMonthLabel,
  getDefaultVisibleMonth,
  getMonthWeekdayGrid,
  toMonthAnchor,
} from "@/lib/calendarUtils";
import type { PhaseTitle, Project } from "@/lib/storage/types";
import { getPhaseTitles } from "@/lib/storage/phaseTitleRepository";
import { MonthWeekRow } from "./MonthWeekRow";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PublicMonthCalendar({ project }: { project: Project }) {
  const [monthAnchor, setMonthAnchor] = useState(() => getDefaultVisibleMonth(project));
  const [phaseTitles, setPhaseTitles] = useState<PhaseTitle[]>([]);
  // Session-only - resets on every visit, never persisted.
  const [showDeliverables, setShowDeliverables] = useState(true);

  useEffect(() => {
    getPhaseTitles().then(setPhaseTitles);
  }, []);

  const firstMonth = toMonthAnchor(project.startDate);
  const lastMonth = toMonthAnchor(project.endDate);
  const canGoPrev = monthAnchor > firstMonth;
  const canGoNext = monthAnchor < lastMonth;

  const weeks = getMonthWeekdayGrid(monthAnchor);
  const rjfBlocks = project.blocks.filter((b) => b.lane === "RJF");
  const clientBlocks = project.blocks.filter((b) => b.lane === "CLIENT");

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b p-3">
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoPrev}
          onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">{formatMonthLabel(monthAnchor)}</h2>
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoNext}
          onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 border-b bg-muted/20 py-1.5 text-xs text-muted-foreground">
        <Switch id="show-deliverables" checked={showDeliverables} onCheckedChange={setShowDeliverables} />
        <Label htmlFor="show-deliverables" className="text-xs font-normal text-muted-foreground">
          Show deliverables
        </Label>
      </div>

      <div className="flex border-b bg-muted/30">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="flex-1 border-l px-2 py-1 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <MonthWeekRow
          key={week[0]}
          days={week}
          monthAnchor={monthAnchor}
          phaseEntries={project.phaseBarEntries}
          phaseTitles={phaseTitles}
          rjfBlocks={rjfBlocks}
          clientBlocks={clientBlocks}
          deliverables={project.deliverables}
          showDeliverables={showDeliverables}
        />
      ))}

      <div className="flex flex-wrap gap-4 border-t p-3 text-xs text-muted-foreground">
        <LegendSwatch className="bg-muted" hatched label="Public holiday / office closed" />
      </div>
    </div>
  );
}

function LegendSwatch({ label, hatched, className }: { label: string; hatched?: boolean; className?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block size-3 rounded-sm border ${className ?? ""} ${
          hatched ? "bg-[repeating-linear-gradient(45deg,theme(colors.muted.foreground/40%),theme(colors.muted.foreground/40%)_2px,transparent_2px,transparent_4px)]" : ""
        }`}
      />
      {label}
    </span>
  );
}
