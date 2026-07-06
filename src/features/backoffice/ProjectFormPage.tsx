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
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProject,
  defaultNewProjectDateRange,
  getProjectById,
  patchProject,
} from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import type { Deliverable, Project } from "@/lib/storage/types";
import { todayIso } from "@/lib/dateUtils";
import { DeliverablesTable } from "./DeliverablesTable";
import { ExportToSheetButton } from "./ExportToSheetButton";
import { ScheduleGrid } from "@/features/schedule/ScheduleGrid";

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
    scheduleVersion: "1.0",
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

  useEffect(() => {
    if (mode === "edit" && projectId) {
      getProjectById(projectId).then((found) => {
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
      });
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
      await patchProject(project.id, { ...fields, deliverables });
      await refreshFromStorage();
      toast.success("Project details saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save project");
    }
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
              <ExternalLink className="size-4" />
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

          <div className="flex flex-col gap-2">
            <Label>Deliverables</Label>
            <DeliverablesTable deliverables={deliverables} onChange={setDeliverables} />
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
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleGrid project={project} readOnly={false} onProjectChanged={refreshFromStorage} />
          </CardContent>
        </Card>
      )}
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
