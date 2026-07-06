/**
 * TermsAndConditions.tsx
 * ---------------------------------------------------------------------------
 * Read-only display of a project's Terms & Conditions text, shown on the
 * public client-facing view underneath the schedule grid. Editing happens
 * via a Textarea directly in ProjectFormPage.
 */
import type { Project } from "@/lib/storage/types";

export function TermsAndConditions({ project }: { project: Project }) {
  if (!project.termsAndConditions.trim()) return null;
  return (
    <div className="rounded-md border p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Terms &amp; Conditions</h2>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{project.termsAndConditions}</p>
    </div>
  );
}
