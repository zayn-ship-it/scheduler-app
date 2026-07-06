/**
 * TermsAndConditions.tsx
 * ---------------------------------------------------------------------------
 * Read-only display of the single, global Terms & Conditions text (shared
 * across all projects), shown on the public client-facing view underneath
 * the schedule grid. Editing happens on the Settings page.
 */
import { useEffect, useState } from "react";
import { getGlobalTermsAndConditions } from "@/lib/storage/settingsRepository";

export function TermsAndConditions() {
  const [text, setText] = useState("");

  useEffect(() => {
    getGlobalTermsAndConditions().then(setText);
  }, []);

  if (!text.trim()) return null;
  return (
    <div className="rounded-md border p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Terms &amp; Conditions</h2>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
