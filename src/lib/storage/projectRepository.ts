/**
 * projectRepository.ts
 * ---------------------------------------------------------------------------
 * Uses Supabase as the backend for all project data.
 * All functions are now async and return Promises.
 */
import { supabase } from "./supabaseClient";
import type {
  Project,
  Deliverable,
  ScheduleBlock,
  PhaseBarEntry,
} from "./types";
import { todayIso } from "@/lib/dateUtils";

export const DEFAULT_TERMS_AND_CONDITIONS = `This schedule is valid only so long as the 50% deposit is paid by the indicated date, any delays will result in the schedule shifting out, please note that the schedule might not shift out by the exact amount of days delayed as other project schedules need to be considered and delays might have a significant impact on timelines. Kindly take note of the scheduled dates for Client/Agency Reviews and Approvals along with dates and times on which feedback is required. It is important to adhere to the target review and approval dates in order to avoid potential shifts in the overall timeline.`;

async function reconstructProject(projectId: string): Promise<Project | undefined> {
  const { data: projectData } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!projectData) return undefined;

  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("*")
    .eq("project_id", projectId);

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("project_id", projectId);

  const { data: phaseBarEntries } = await supabase
    .from("phase_bar_entries")
    .select("*")
    .eq("project_id", projectId);

  return {
    id: projectData.id,
    projectCode: projectData.project_code,
    client: projectData.client,
    date: projectData.date,
    scheduleVersion: projectData.schedule_version,
    projectName: projectData.project_name,
    brand: projectData.brand,
    projectManager: projectData.project_manager,
    producer: projectData.producer,
    startDate: projectData.start_date,
    endDate: projectData.end_date,
    termsAndConditions: projectData.terms_and_conditions,
    deliverables: (deliverables || []).map((d: any) => ({
      id: d.id,
      identifier: d.identifier,
      description: d.description,
      qty: d.qty,
    })),
    blocks: (blocks || []).map((b: any) => ({
      id: b.id,
      lane: b.lane,
      title: b.title,
      subHeading: b.sub_heading,
      startDate: b.start_date,
      endDate: b.end_date,
      timeRange: b.time_range,
      mode: b.mode,
      notes: b.notes || [],
      color: b.color,
      personId: b.person_id,
    })),
    phaseBarEntries: (phaseBarEntries || []).map((p: any) => ({
      id: p.id,
      label: p.label,
      startDate: p.start_date,
      endDate: p.end_date,
      color: p.color,
    })),
    createdAt: projectData.created_at,
    updatedAt: projectData.updated_at,
  };
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projectRepository] getProjects error:", error);
    return [];
  }

  const projects: Project[] = [];
  for (const p of data || []) {
    const project = await reconstructProject(p.id);
    if (project) projects.push(project);
  }
  return projects;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return reconstructProject(id);
}

export type NewProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt" | "deliverables" | "blocks" | "phaseBarEntries" | "termsAndConditions"
> & {
  deliverables?: Deliverable[];
  termsAndConditions?: string;
};

export async function createProject(input: NewProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();

  const { error: projectError } = await supabase.from("projects").insert({
    id: projectId,
    project_code: input.projectCode,
    client: input.client,
    date: input.date,
    schedule_version: input.scheduleVersion,
    project_name: input.projectName,
    brand: input.brand,
    project_manager: input.projectManager,
    producer: input.producer,
    start_date: input.startDate,
    end_date: input.endDate,
    terms_and_conditions: input.termsAndConditions ?? DEFAULT_TERMS_AND_CONDITIONS,
    created_at: now,
    updated_at: now,
  });

  if (projectError) throw projectError;

  if (input.deliverables && input.deliverables.length > 0) {
    const deliverablesToInsert = input.deliverables.map((d) => ({
      id: d.id || crypto.randomUUID(),
      project_id: projectId,
      identifier: d.identifier,
      description: d.description,
      qty: d.qty,
    }));
    await supabase.from("deliverables").insert(deliverablesToInsert);
  }

  const project = await reconstructProject(projectId);
  if (!project) throw new Error("Failed to create project");
  return project;
}

export async function updateProject(updated: Project): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      project_code: updated.projectCode,
      client: updated.client,
      date: updated.date,
      schedule_version: updated.scheduleVersion,
      project_name: updated.projectName,
      brand: updated.brand,
      project_manager: updated.projectManager,
      producer: updated.producer,
      start_date: updated.startDate,
      end_date: updated.endDate,
      terms_and_conditions: updated.termsAndConditions,
      updated_at: now,
    })
    .eq("id", updated.id);

  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function patchProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "createdAt">>
): Promise<Project | undefined> {
  const project = await getProjectById(id);
  if (!project) return undefined;

  const updated: Project = { ...project, ...patch };
  await updateProject(updated);
  return updated;
}

// Deliverables
export async function addDeliverable(
  projectId: string,
  deliverable: Omit<Deliverable, "id">
): Promise<Project | undefined> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("deliverables").insert({
    id,
    project_id: projectId,
    identifier: deliverable.identifier,
    description: deliverable.description,
    qty: deliverable.qty,
  });

  if (error) throw error;
  return getProjectById(projectId);
}

export async function updateDeliverable(
  projectId: string,
  deliverable: Deliverable
): Promise<Project | undefined> {
  const { error } = await supabase
    .from("deliverables")
    .update({
      identifier: deliverable.identifier,
      description: deliverable.description,
      qty: deliverable.qty,
    })
    .eq("id", deliverable.id);

  if (error) throw error;
  return getProjectById(projectId);
}

export async function removeDeliverable(
  projectId: string,
  deliverableId: string
): Promise<Project | undefined> {
  const { error } = await supabase.from("deliverables").delete().eq("id", deliverableId);
  if (error) throw error;
  return getProjectById(projectId);
}

// Schedule blocks
export async function addBlock(
  projectId: string,
  block: Omit<ScheduleBlock, "id">
): Promise<ScheduleBlock | undefined> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("schedule_blocks").insert({
    id,
    project_id: projectId,
    lane: block.lane,
    title: block.title,
    sub_heading: block.subHeading,
    start_date: block.startDate,
    end_date: block.endDate,
    time_range: block.timeRange,
    mode: block.mode,
    notes: block.notes,
    color: block.color,
    person_id: block.personId,
  });

  if (error) throw error;
  return { ...block, id };
}

export async function updateBlock(projectId: string, block: ScheduleBlock): Promise<void> {
  const { error } = await supabase
    .from("schedule_blocks")
    .update({
      lane: block.lane,
      title: block.title,
      sub_heading: block.subHeading,
      start_date: block.startDate,
      end_date: block.endDate,
      time_range: block.timeRange,
      mode: block.mode,
      notes: block.notes,
      color: block.color,
      person_id: block.personId,
    })
    .eq("id", block.id);

  if (error) throw error;
}

export async function removeBlock(projectId: string, blockId: string): Promise<void> {
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", blockId);
  if (error) throw error;
}

// Phase bar entries
export async function addPhaseBarEntry(
  projectId: string,
  entry: Omit<PhaseBarEntry, "id">
): Promise<PhaseBarEntry | undefined> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("phase_bar_entries").insert({
    id,
    project_id: projectId,
    label: entry.label,
    start_date: entry.startDate,
    end_date: entry.endDate,
    color: entry.color,
  });

  if (error) throw error;
  return { ...entry, id };
}

export async function updatePhaseBarEntry(projectId: string, entry: PhaseBarEntry): Promise<void> {
  const { error } = await supabase
    .from("phase_bar_entries")
    .update({
      label: entry.label,
      start_date: entry.startDate,
      end_date: entry.endDate,
      color: entry.color,
    })
    .eq("id", entry.id);

  if (error) throw error;
}

export async function removePhaseBarEntry(projectId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from("phase_bar_entries").delete().eq("id", entryId);
  if (error) throw error;
}

export function defaultNewProjectDateRange(): { startDate: string; endDate: string } {
  const start = todayIso();
  const startDate = new Date(start);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 27);
  return { startDate: start, endDate: todayIsoFromDate(end) };
}

function todayIsoFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
