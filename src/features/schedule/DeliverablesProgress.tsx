/**
 * DeliverablesProgress.tsx
 * ---------------------------------------------------------------------------
 * Small "X of Y deliverables complete" progress bar, shared between the
 * back office (ProjectFormPage) and the public/live view (PublicScheduleView)
 * so both always agree on how completion is counted.
 */
import { Progress } from "@/components/ui/progress";
import type { Deliverable } from "@/lib/storage/types";

export function DeliverablesProgress({ deliverables }: { deliverables: Deliverable[] }) {
  if (deliverables.length === 0) return null;

  const completedCount = deliverables.filter((d) => d.completed).length;
  const percent = Math.round((completedCount / deliverables.length) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Deliverables progress</span>
        <span>
          {completedCount} of {deliverables.length} complete
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
