/**
 * projectRepository.ts
 * ---------------------------------------------------------------------------
 * The ONLY module that knows where/how Projects are stored. Every part of
 * the app (back office pages, the public schedule view) should read/write
 * projects through the functions here, never through localStorage directly.
 *
 * Why this matters: if a future phase replaces localStorage with a real
 * backend API, only this file needs to change - every component that calls
 * `getProjects()`, `saveProject()`, etc. keeps working unmodified.
 *
 * All functions are synchronous because localStorage is synchronous, but
 * they're written so a future async (fetch-based) version would have a
 * near-identical call shape (just returning Promises instead of values).
 */
import { readJson, writeJson } from "./localStorageClient";
import type {
  Project,
  Deliverable,
  ScheduleBlock,
  PhaseBarEntry,
} from "./types";
import { todayIso } from "@/lib/dateUtils";

const STORAGE_KEY = "schedule-app:projects";

/** Default Terms & Conditions text pre-filled when a new project is created. */
export const DEFAULT_TERMS_AND_CONDITIONS = `This schedule is valid only so long as the 50% deposit is paid by the indicated date, any delays will result in the schedule shifting out, please note that the schedule might not shift out by the exact amount of days delayed as other project schedules need to be considered and delays might have a significant impact on timelines. Kindly take note of the scheduled dates for Client/Agency Reviews and Approvals along with dates and times on which feedback is required. It is important to adhere to the target review and approval dates in order to avoid potential shifts in the overall timeline.`;

/** Returns every project currently stored, newest-created first. */
export function getProjects(): Project[] {
  const projects = readJson<Project[]>(STORAGE_KEY, []);
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Returns a single project by id, or undefined if no project with that id exists. */
export function getProjectById(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

/** Persists the full project list. Internal helper - external code should use the more specific functions below. */
function saveAll(projects: Project[]): void {
  writeJson(STORAGE_KEY, projects);
}

/** Fields the caller supplies when creating a new project; everything else (id, timestamps, empty arrays) is filled in here. */
export type NewProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt" | "deliverables" | "blocks" | "phaseBarEntries" | "termsAndConditions"
> & {
  deliverables?: Deliverable[];
  termsAndConditions?: string;
};

/** Creates a new project with a generated id and timestamps, and persists it. Returns the created project. */
export function createProject(input: NewProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: crypto.randomUUID(),
    deliverables: input.deliverables ?? [],
    blocks: [],
    phaseBarEntries: [],
    termsAndConditions: input.termsAndConditions ?? DEFAULT_TERMS_AND_CONDITIONS,
    createdAt: now,
    updatedAt: now,
  };
  const all = getProjects();
  all.push(project);
  saveAll(all);
  return project;
}

/** Replaces the stored project matching `updated.id` with `updated` (bumping `updatedAt`). No-op if the id isn't found. */
export function updateProject(updated: Project): void {
  const all = getProjects();
  const index = all.findIndex((p) => p.id === updated.id);
  if (index === -1) {
    console.error(`[projectRepository] updateProject: no project with id "${updated.id}"`);
    return;
  }
  all[index] = { ...updated, updatedAt: new Date().toISOString() };
  saveAll(all);
}

/** Deletes a project by id. No-op if it doesn't exist. */
export function deleteProject(id: string): void {
  saveAll(getProjects().filter((p) => p.id !== id));
}

/**
 * Applies a partial update to one project's top-level fields (e.g. just the
 * date range, or just the header fields) without needing the caller to
 * reconstruct the whole Project object. Blocks/deliverables/phase entries
 * are left untouched unless explicitly included in `patch`.
 */
export function patchProject(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Project | undefined {
  const project = getProjectById(id);
  if (!project) {
    console.error(`[projectRepository] patchProject: no project with id "${id}"`);
    return undefined;
  }
  const updated: Project = { ...project, ...patch, updatedAt: new Date().toISOString() };
  updateProject(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Deliverables (rows within a project)
// ---------------------------------------------------------------------------

export function addDeliverable(projectId: string, deliverable: Omit<Deliverable, "id">): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  const updated = {
    ...project,
    deliverables: [...project.deliverables, { ...deliverable, id: crypto.randomUUID() }],
  };
  updateProject(updated);
  return updated;
}

export function updateDeliverable(projectId: string, deliverable: Deliverable): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  const updated = {
    ...project,
    deliverables: project.deliverables.map((d) => (d.id === deliverable.id ? deliverable : d)),
  };
  updateProject(updated);
  return updated;
}

export function removeDeliverable(projectId: string, deliverableId: string): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  const updated = {
    ...project,
    deliverables: project.deliverables.filter((d) => d.id !== deliverableId),
  };
  updateProject(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Schedule blocks (the draggable/resizable cards on the grid)
// ---------------------------------------------------------------------------

/** Adds a new schedule block to a project. Returns the created block, or undefined if the project doesn't exist. */
export function addBlock(projectId: string, block: Omit<ScheduleBlock, "id">): ScheduleBlock | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  const newBlock: ScheduleBlock = { ...block, id: crypto.randomUUID() };
  updateProject({ ...project, blocks: [...project.blocks, newBlock] });
  return newBlock;
}

/** Replaces one block (matched by id) within a project - used for both metadata edits and drag/resize commits. */
export function updateBlock(projectId: string, block: ScheduleBlock): void {
  const project = getProjectById(projectId);
  if (!project) return;
  updateProject({
    ...project,
    blocks: project.blocks.map((b) => (b.id === block.id ? block : b)),
  });
}

export function removeBlock(projectId: string, blockId: string): void {
  const project = getProjectById(projectId);
  if (!project) return;
  updateProject({ ...project, blocks: project.blocks.filter((b) => b.id !== blockId) });
}

// ---------------------------------------------------------------------------
// Phase bar entries
// ---------------------------------------------------------------------------

export function addPhaseBarEntry(projectId: string, entry: Omit<PhaseBarEntry, "id">): PhaseBarEntry | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  const newEntry: PhaseBarEntry = { ...entry, id: crypto.randomUUID() };
  updateProject({ ...project, phaseBarEntries: [...project.phaseBarEntries, newEntry] });
  return newEntry;
}

export function updatePhaseBarEntry(projectId: string, entry: PhaseBarEntry): void {
  const project = getProjectById(projectId);
  if (!project) return;
  updateProject({
    ...project,
    phaseBarEntries: project.phaseBarEntries.map((e) => (e.id === entry.id ? entry : e)),
  });
}

export function removePhaseBarEntry(projectId: string, entryId: string): void {
  const project = getProjectById(projectId);
  if (!project) return;
  updateProject({
    ...project,
    phaseBarEntries: project.phaseBarEntries.filter((e) => e.id !== entryId),
  });
}

/** Convenience default used when pre-filling a new project's start/end date pickers. */
export function defaultNewProjectDateRange(): { startDate: string; endDate: string } {
  const start = todayIso();
  // Default to a 4-week window - just a sensible starting point the admin can change immediately.
  const startDate = new Date(start);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 27);
  return { startDate: start, endDate: todayIsoFromDate(end) };
}

function todayIsoFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
