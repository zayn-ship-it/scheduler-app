/**
 * ProjectHeader.tsx
 * ---------------------------------------------------------------------------
 * Read-only display of a project's header/meta fields (Project Code,
 * Client, Date, Schedule Version, Project Name, Brand, Project Manager,
 * Producer), matching the top block of the original spreadsheet document.
 * Used on the public client-facing view. (Back office editing of these
 * fields happens via plain form inputs in ProjectFormPage, not here.)
 */
import type { Project } from "@/lib/storage/types";
import { formatDisplayDate } from "@/lib/dateUtils";

export function ProjectHeader({ project }: { project: Project }) {
  const fields: { label: string; value: string }[] = [
    { label: "Project Code", value: project.projectCode },
    { label: "Client", value: project.client },
    { label: "Date", value: project.date ? formatDisplayDate(project.date) : "" },
    { label: "Schedule Version", value: project.scheduleVersion },
    { label: "Brand", value: project.brand },
    { label: "Project Manager", value: project.projectManager },
    { label: "Producer", value: project.producer },
  ];

  return (
    <div className="rounded-md border p-4">
      <img src="/rjf-logo.svg" alt="RJF" className="mb-3 h-auto w-[180px]" />
      <h1 className="mb-1 text-xl font-bold">{project.projectName || "Untitled Project"}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {formatDisplayDate(project.startDate)} – {formatDisplayDate(project.endDate)}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {fields
          .filter((f) => f.value)
          .map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium uppercase text-muted-foreground">{f.label}</dt>
              <dd className="text-sm">{f.value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
