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
  ProjectVersion,
} from "./types";
import { todayIso, shiftRange, fromIsoDate } from "@/lib/dateUtils";

/**
 * How a block or phase bar entry responds to a delay at `date`, in either direction (deltaDays = 1 to
 * insert a delay, -1 to undo one): one that hasn't started yet by `date` pushes wholesale (both start
 * and end move); one already under way at `date` (started before, still running on/after it) just runs
 * one day longer/shorter - only its end date moves. One that finished before `date` is untouched.
 * Applying this with the same `date` in both directions is symmetric: a pushed item's startDate stays
 * >= date, and an expanded item's startDate stays < date with endDate >= date, so the same branch is
 * taken on the way back out. Shared by both schedule blocks and phase bar entries, since both are just
 * a startDate/endDate range as far as this logic cares.
 */
function applyDelayShift<T extends { startDate: string; endDate: string }>(item: T, date: string, deltaDays: 1 | -1): T {
  if (item.startDate >= date) {
    return {
      ...item,
      startDate: shiftOneBusinessDay(item.startDate, deltaDays),
      endDate: shiftOneBusinessDay(item.endDate, deltaDays),
    };
  }
  if (item.endDate >= date) {
    return { ...item, endDate: shiftOneBusinessDay(item.endDate, deltaDays) };
  }
  return item;
}

/** Shifts a date by one calendar day in `direction`, then nudges off a weekend landing (Sat/Sun -> Mon going forward, Sun/Sat -> Fri going backward) so delay shifts stay on a 5-day work week. */
function shiftOneBusinessDay(dateIso: string, direction: 1 | -1): string {
  let result = shiftRange(dateIso, dateIso, direction).startDate;
  const dow = fromIsoDate(result).getDay(); // 0 = Sun, 6 = Sat
  if (direction === 1 && dow === 6) result = shiftRange(result, result, 2).startDate;
  else if (direction === 1 && dow === 0) result = shiftRange(result, result, 1).startDate;
  else if (direction === -1 && dow === 0) result = shiftRange(result, result, -2).startDate;
  else if (direction === -1 && dow === 6) result = shiftRange(result, result, -1).startDate;
  return result;
}

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
    deliverables: (deliverables || []).map((d: any) => ({
      id: d.id,
      identifier: d.identifier,
      description: d.description,
      qty: d.qty,
      duration: d.duration ?? "",
      aspectRatio: d.aspect_ratio ?? "",
      completed: d.completed ?? false,
    })),
    blocks: (blocks || []).map((b: any) => ({
      id: b.id,
      lane: b.lane,
      title: b.title,
      startDate: b.start_date,
      endDate: b.end_date,
      timeRange: b.time_range,
      mode: b.mode,
      information: b.information || [],
      deliverableIds: b.deliverable_ids || [],
      color: b.color,
      personId: b.person_id,
      externalLink: b.external_link,
      linkLabel: b.link_label,
      isDelay: b.is_delay ?? false,
    })),
    phaseBarEntries: (phaseBarEntries || []).map((p: any) => ({
      id: p.id,
      phaseTitleId: p.phase_title_id,
      startDate: p.start_date,
      endDate: p.end_date,
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
  "id" | "createdAt" | "updatedAt" | "deliverables" | "blocks" | "phaseBarEntries"
> & {
  deliverables?: Deliverable[];
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
      duration: d.duration,
      aspect_ratio: d.aspectRatio,
      completed: d.completed,
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
    duration: deliverable.duration,
    aspect_ratio: deliverable.aspectRatio,
    completed: deliverable.completed,
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
      duration: deliverable.duration,
      aspect_ratio: deliverable.aspectRatio,
      completed: deliverable.completed,
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
    start_date: block.startDate,
    end_date: block.endDate,
    time_range: block.timeRange,
    mode: block.mode,
    information: block.information,
    deliverable_ids: block.deliverableIds,
    color: block.color,
    person_id: block.personId,
    external_link: block.externalLink,
    link_label: block.linkLabel,
    is_delay: block.isDelay,
  });

  if (error) throw error;
  return { ...block, id };
}

export async function updateBlock(_projectId: string, block: ScheduleBlock): Promise<void> {
  const { error } = await supabase
    .from("schedule_blocks")
    .update({
      lane: block.lane,
      title: block.title,
      start_date: block.startDate,
      end_date: block.endDate,
      time_range: block.timeRange,
      mode: block.mode,
      information: block.information,
      deliverable_ids: block.deliverableIds,
      color: block.color,
      person_id: block.personId,
      external_link: block.externalLink,
      link_label: block.linkLabel,
      is_delay: block.isDelay,
    })
    .eq("id", block.id);

  if (error) throw error;
}

export async function removeBlock(_projectId: string, blockId: string): Promise<void> {
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
    phase_title_id: entry.phaseTitleId,
    start_date: entry.startDate,
    end_date: entry.endDate,
  });

  if (error) throw error;
  return { ...entry, id };
}

export async function updatePhaseBarEntry(_projectId: string, entry: PhaseBarEntry): Promise<void> {
  const { error } = await supabase
    .from("phase_bar_entries")
    .update({
      phase_title_id: entry.phaseTitleId,
      start_date: entry.startDate,
      end_date: entry.endDate,
    })
    .eq("id", entry.id);

  if (error) throw error;
}

export async function removePhaseBarEntry(_projectId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from("phase_bar_entries").delete().eq("id", entryId);
  if (error) throw error;
}

// Project versions (delay-block snapshots + manual checkpoints)
export async function listProjectVersions(projectId: string): Promise<ProjectVersion[]> {
  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projectRepository] listProjectVersions error:", error);
    return [];
  }

  return (data || []).map((v: any) => ({
    id: v.id,
    projectId: v.project_id,
    label: v.label,
    blocks: v.blocks,
    phaseBarEntries: v.phase_bar_entries,
    createdAt: v.created_at,
  }));
}

/** Snapshots the project's current blocks/phase bar entries as a new named version - a manual checkpoint, no date shift. */
export async function saveProjectVersion(projectId: string, label: string): Promise<ProjectVersion> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_versions").insert({
    id,
    project_id: projectId,
    label,
    blocks: project.blocks,
    phase_bar_entries: project.phaseBarEntries,
    created_at: now,
  });

  if (error) throw error;
  return { id, projectId, label, blocks: project.blocks, phaseBarEntries: project.phaseBarEntries, createdAt: now };
}

/**
 * Inserts a 1-day "delay" block into `lane` (RJF/Client only) at `date`, then applies `applyDelayShift`
 * to every other RJF/Client block and every phase bar entry that hasn't already finished before `date`:
 * one not yet started pushes wholesale, one already under way (straddling `date`) just runs a day
 * longer. Suppliers/Internal/Leave Tracker are left untouched, as are blocks/phases that already
 * finished before the delay. The pre-delay state is captured as a new ProjectVersion first, so it
 * stays viewable.
 */
export async function insertDelayBlock(projectId: string, lane: "RJF" | "CLIENT", date: string): Promise<Project | undefined> {
  const project = await getProjectById(projectId);
  if (!project) return undefined;

  await saveProjectVersion(projectId, project.scheduleVersion || "Before delay");

  await addBlock(projectId, {
    lane,
    title: "",
    startDate: date,
    endDate: date,
    timeRange: "",
    mode: null,
    information: [],
    deliverableIds: [],
    color: "",
    personId: null,
    externalLink: null,
    linkLabel: null,
    isDelay: true,
  });

  const blocksToShift = project.blocks.filter(
    (b) => (b.lane === "RJF" || b.lane === "CLIENT") && b.endDate >= date,
  );
  const entriesToShift = project.phaseBarEntries.filter((p) => p.endDate >= date);

  // Independent rows - shift them all in parallel instead of one round-trip at a time (this can otherwise take several seconds for a busy schedule).
  await Promise.all([
    ...blocksToShift.map((block) => updateBlock(projectId, applyDelayShift(block, date, 1))),
    ...entriesToShift.map((entry) => updatePhaseBarEntry(projectId, applyDelayShift(entry, date, 1))),
  ]);

  return getProjectById(projectId);
}

/**
 * Reverses `insertDelayBlock`: applies `applyDelayShift` with deltaDays -1 to every RJF/Client block
 * (other than the delay marker itself) and phase bar entry that hasn't finished before the delay's own
 * date, then deletes the delay marker - restoring the schedule to exactly how it looked before the
 * delay was inserted. No new version snapshot is taken (undoing already returns to a known-good state).
 */
export async function removeDelayBlock(projectId: string, blockId: string): Promise<Project | undefined> {
  const project = await getProjectById(projectId);
  if (!project) return undefined;

  const delayBlock = project.blocks.find((b) => b.id === blockId && b.isDelay);
  if (!delayBlock) return project;

  const date = delayBlock.startDate;
  const blocksToShift = project.blocks.filter(
    (b) => b.id !== blockId && (b.lane === "RJF" || b.lane === "CLIENT") && b.endDate >= date,
  );
  const entriesToShift = project.phaseBarEntries.filter((p) => p.endDate >= date);

  await Promise.all([
    ...blocksToShift.map((block) => updateBlock(projectId, applyDelayShift(block, date, -1))),
    ...entriesToShift.map((entry) => updatePhaseBarEntry(projectId, applyDelayShift(entry, date, -1))),
  ]);

  await removeBlock(projectId, blockId);

  return getProjectById(projectId);
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
