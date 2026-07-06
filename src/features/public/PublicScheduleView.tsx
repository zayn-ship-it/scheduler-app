/**
 * PublicScheduleView.tsx
 * ---------------------------------------------------------------------------
 * The client-facing "live view" page, reachable at /schedule/:projectId with
 * NO password gate - this is the link an admin copies and sends to a
 * client. Renders the project header/deliverables/T&Cs plus a read-only
 * MONTH CALENDAR of just the RJF and Client lanes (see
 * PublicMonthCalendar.tsx) - Suppliers/Internal/Leave Tracker are internal
 * only and never appear here. The back office's own ScheduleGrid (all 5
 * lanes, continuous timeline, drag/resize) is a completely separate
 * component and is unaffected by this view.
 *
 * KNOWN PHASE 1 LIMITATION: because there is no backend yet, this reads the
 * project straight out of the current browser's localStorage. The link will
 * only resolve on the same browser/device that created the project - a real
 * backend (Phase 2) is required before this link can be shared to another
 * device and actually work.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectById } from "@/lib/storage/projectRepository";
import type { Project } from "@/lib/storage/types";
import { ProjectHeader } from "@/features/schedule/ProjectHeader";
import { TermsAndConditions } from "@/features/schedule/TermsAndConditions";
import { PublicMonthCalendar } from "./PublicMonthCalendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PublicScheduleView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (projectId) setProject(getProjectById(projectId));
    setLoaded(true);
  }, [projectId]);

  if (!loaded) return null;

  if (!project) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <p className="text-muted-foreground">Project not found or link is invalid.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 py-8">
      <ProjectHeader project={project} />

      {project.deliverables.length > 0 && (
        <div className="rounded-md border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Deliverables</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.deliverables.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.identifier}</TableCell>
                  <TableCell>{d.description}</TableCell>
                  <TableCell className="text-right">{d.qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PublicMonthCalendar project={project} />

      <TermsAndConditions project={project} />
    </div>
  );
}
