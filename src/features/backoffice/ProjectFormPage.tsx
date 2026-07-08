/**
 * ProjectFormPage.tsx
 * ---------------------------------------------------------------------------
 * Two jobs depending on `mode`:
 *  - "create": a form for the project's header fields + date range +
 *    deliverables + Terms & Conditions. Submitting creates the project and
 *    navigates straight to its edit page.
 *  - "edit": loads an existing project, lets the admin change any header
 *    field or the date range at any time (BRS requirement: "you should be
 *    able to select the dates the project runs from, any change any time"),
 *    and renders the interactive ScheduleGrid below for building out blocks
 *    and phases.
 *
 * Changing the date range never deletes existing blocks, even if they fall
 * outside the new range - they're just not visible until the range covers
 * them again. We warn the admin about this rather than silently clipping or
 * deleting their data.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createProject,
  defaultNewProjectDateRange,
  getProjectById,
  patchProject,
  saveProjectVersion,
} from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import type { Deliverable, Project, ProjectVersion } from "@/lib/storage/types";
import { todayIso } from "@/lib/dateUtils";
import { DeliverablesTable } from "./DeliverablesTable";
import { DeliverablesProgress } from "@/features/schedule/DeliverablesProgress";
import { ExportToSheetButton } from "./ExportToSheetButton";
import { ScheduleGrid } from "@/features/schedule/ScheduleGrid";
import { VersionSelect, CURRENT_VERSION_VALUE } from "@/features/schedule/VersionSelect";

/** The header/meta fields shared between create and edit modes. */
interface HeaderFields {
  projectCode: string;
  client: string;
  date: string;
  scheduleVersion: string;
  projectName: string;
  brand: string;
  projectManager: string;
  producer: string;
  startDate: string;
  endDate: string;
}

function emptyHeaderFields(): HeaderFields {
  const { startDate, endDate } = defaultNewProjectDateRange();
  return {
    projectCode: "",
    client: "",
    date: todayIso(),
    scheduleVersion: "1",
    projectName: "",
    brand: "",
    projectManager: "",
    producer: "",
    startDate,
    endDate,
  };
}

export function ProjectFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [fields, setFields] = useState<HeaderFields>(emptyHeaderFields());
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [selectedVersionId, setSelectedVersionId] = useState(CURRENT_VERSION_VALUE);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [confirmingSaveVersion, setConfirmingSaveVersion] = useState(false);

  useEffect(() => {
    if (mode === "edit" && projectId) {
      getProjectById(projectId)
        .then((found) => {
          if (found) {
            setProject(found);
            setFields({
              projectCode: found.projectCode,
              client: found.client,
              date: found.date,
              scheduleVersion: found.scheduleVersion,
              projectName: found.projectName,
              brand: found.brand,
              projectManager: found.projectManager,
              producer: found.producer,
              startDate: found.startDate,
              endDate: found.endDate,
            });
            setDeliverables(found.deliverables);
          }
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projectId]);

  function updateField<K extends keyof HeaderFields>(key: K, value: HeaderFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function refreshFromStorage() {
    if (projectId) {
      const updated = await getProjectById(projectId);
      setProject(updated ?? null);
      setVersionsRefreshKey((k) => k + 1);
    }
  }

  async function handleSaveVersion() {
    if (!project) return;
    try {
      await saveProjectVersion(project.id, project.scheduleVersion || "Untitled version");
      setVersionsRefreshKey((k) => k + 1);
      toast.success("Version saved");
    } catch (error) {
      console.error("Failed to save version:", error);
      toast.error("Failed to save version");
    } finally {
      setConfirmingSaveVersion(false);
    }
  }

  async function handleCreate() {
    try {
      const created = await createProject({ ...fields, deliverables });
      toast.success("Project created");
      navigate(`/backoffice/projects/${created.id}/edit`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create project");
    }
  }

  async function handleSaveDetails() {
    if (!project) return;

    const outOfRangeCount = project.blocks.filter(
      (b) => b.endDate < fields.startDate || b.startDate > fields.endDate,
    ).length;
    if (outOfRangeCount > 0) {
      toast.warning(
        `${outOfRangeCount} schedule block(s) fall outside the new date range. They have NOT been deleted - widen the range again to see them.`,
      );
    }

    try {
      await patchProject(project.id, fields);
      await refreshFromStorage();
      toast.success("Project details saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save project");
    }
  }

  if (mode === "edit" && loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "edit" && !project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{mode === "create" ? "New Project" : project?.projectName || "Edit Project"}</h1>
        {mode === "edit" && project && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`${window.location.origin}/schedule/${project.id}`, "_blank", "noopener,noreferrer")}
            >
              <Icon name="link_2" size={16} />
              View Live Link
            </Button>
            <ExportToSheetButton />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Project Code" value={fields.projectCode} onChange={(v) => updateField("projectCode", v)} />
            <Field label="Client" value={fields.client} onChange={(v) => updateField("client", v)} />
            <Field label="Project Name" value={fields.projectName} onChange={(v) => updateField("projectName", v)} />
            <Field label="Brand" value={fields.brand} onChange={(v) => updateField("brand", v)} />
            <PersonSelectField
              label="Project Manager"
              value={fields.projectManager}
              onChange={(v) => updateField("projectManager", v)}
            />
            <PersonSelectField label="Producer" value={fields.producer} onChange={(v) => updateField("producer", v)} />
            <Field label="Schedule Version" value={fields.scheduleVersion} onChange={(v) => updateField("scheduleVersion", v)} />
            <Field label="Date" type="date" value={fields.date} onChange={(v) => updateField("date", v)} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Schedule start date"
              type="date"
              value={fields.startDate}
              onChange={(v) => updateField("startDate", v)}
            />
            <Field
              label="Schedule end date"
              type="date"
              value={fields.endDate}
              onChange={(v) => updateField("endDate", v)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The schedule grid only shows days within this range. You can change these dates at any time - existing
            schedule blocks are kept even if they briefly fall outside the range.
          </p>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label>Deliverables</Label>
            {mode === "edit" && project && <DeliverablesProgress deliverables={project.deliverables} />}
            {mode === "create" ? (
              <NewProjectDeliverablesFields deliverables={deliverables} onChange={setDeliverables} />
            ) : (
              project && (
                <DeliverablesTable
                  projectId={project.id}
                  deliverables={project.deliverables}
                  onProjectChanged={refreshFromStorage}
                />
              )
            )}
          </div>

          <div>
            {mode === "create" ? (
              <Button onClick={handleCreate} disabled={!fields.projectName.trim()}>
                Create Project
              </Button>
            ) : (
              <Button onClick={handleSaveDetails}>Save Details</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {mode === "edit" && project && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <VersionSelect
                  projectId={project.id}
                  value={selectedVersionId}
                  refreshKey={versionsRefreshKey}
                  onChange={(value, version) => {
                    setSelectedVersionId(value);
                    setSelectedVersion(version);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => setConfirmingSaveVersion(true)}>
                  Save version
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedVersionId === CURRENT_VERSION_VALUE ? (
              <ScheduleGrid project={project} readOnly={false} onProjectChanged={refreshFromStorage} />
            ) : (
              <ScheduleGrid
                project={{
                  ...project,
                  blocks: selectedVersion?.blocks ?? [],
                  phaseBarEntries: selectedVersion?.phaseBarEntries ?? [],
                }}
                readOnly
                onProjectChanged={() => {}}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmingSaveVersion} onOpenChange={setConfirmingSaveVersion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this as a new version?</DialogTitle>
            <DialogDescription>
              This saves a named snapshot of the current schedule for your records - it doesn't affect what's live.
              The public schedule link always shows the current schedule regardless of saved versions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmingSaveVersion(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVersion}>Save version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Local-only deliverables editor used only in "create" mode, before the
 * project (and therefore a projectId to persist against) exists yet. Once
 * the project is created, deliverables switch to the self-persisting
 * DeliverablesTable.
 */
function NewProjectDeliverablesFields({
  deliverables,
  onChange,
}: {
  deliverables: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
}) {
  function addRow() {
    onChange([
      ...deliverables,
      { id: crypto.randomUUID(), identifier: "", description: "", qty: 1, duration: "", aspectRatio: "", completed: false },
    ]);
  }

  function updateRow(id: string, patch: Partial<Deliverable>) {
    onChange(deliverables.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeRow(id: string) {
    onChange(deliverables.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Identifier</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Duration</TableHead>
            <TableHead className="w-24">Aspect Ratio</TableHead>
            <TableHead className="w-20">Qty</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliverables.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  value={row.identifier}
                  placeholder="WEB001"
                  onChange={(e) => updateRow(row.id, { identifier: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.description}
                  placeholder="Single Page Squeeze Page (Webflow)"
                  onChange={(e) => updateRow(row.id, { description: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input value={row.duration} placeholder="30s" onChange={(e) => updateRow(row.id, { duration: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input
                  value={row.aspectRatio}
                  placeholder="16:9"
                  onChange={(e) => updateRow(row.id, { aspectRatio: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)}>
                  <Icon name="delete" size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button size="sm" variant="outline" onClick={addRow} className="self-start">
        <Icon name="add" size={16} />
        Add Deliverable
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const UNASSIGNED = "__unassigned__";

/**
 * A dropdown of names from the People list (managed on the People page),
 * used for the Project Manager / Producer fields so they're picked from a
 * known set of team members rather than free-typed each time. Stores the
 * person's plain name string on the project (same as before) rather than a
 * Person id, so no data migration is needed - if the stored name doesn't
 * match anyone currently in the People list (e.g. they were since removed,
 * or the value predates this dropdown), it's still shown as a selectable
 * option so it isn't silently lost.
 */
function PersonSelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    getPeople().then(setPeople);
  }, []);

  const peopleNames = people.map((p) => p.name);
  const options = value && !peopleNames.includes(value) ? [...peopleNames, value] : peopleNames;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={value || UNASSIGNED} onValueChange={(v) => onChange(v === UNASSIGNED ? "" : v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {options.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
