/**
 * VersionSelect.tsx
 * ---------------------------------------------------------------------------
 * Dropdown of a project's saved schedule versions (auto-snapshotted whenever
 * a delay block is inserted, or manually via "Save version"), plus "Current"
 * for the live/editable data. Purely a read-only history viewer - picking an
 * old version does not restore/overwrite the live project, it just changes
 * what the caller renders (see ProjectFormPage.tsx / PublicMonthCalendar.tsx).
 */
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProjectVersions } from "@/lib/storage/projectRepository";
import type { ProjectVersion } from "@/lib/storage/types";
import { formatDisplayDate } from "@/lib/dateUtils";

export const CURRENT_VERSION_VALUE = "current";

export function VersionSelect({
  projectId,
  value,
  onChange,
  refreshKey,
}: {
  projectId: string;
  value: string;
  onChange: (value: string, version: ProjectVersion | null) => void;
  /** Bump this (e.g. after inserting a delay/saving a version) to re-fetch the version list. */
  refreshKey?: unknown;
}) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  useEffect(() => {
    listProjectVersions(projectId).then(setVersions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const version = versions.find((ver) => ver.id === v) ?? null;
        onChange(v, version);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CURRENT_VERSION_VALUE}>Current</SelectItem>
        {versions.map((version) => (
          <SelectItem key={version.id} value={version.id}>
            {version.label} · {formatDisplayDate(version.createdAt.slice(0, 10))}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
