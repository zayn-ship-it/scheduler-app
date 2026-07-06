/**
 * types.ts
 * ---------------------------------------------------------------------------
 * Shared TypeScript types for everything stored in the app.
 *
 * This file describes the *shape* of the data only. It has no logic and does
 * not touch localStorage directly - see `localStorageClient.ts` for the raw
 * read/write helpers and `projectRepository.ts` / `peopleRepository.ts` for
 * the actual CRUD operations that use these types.
 *
 * Keeping all types in one place makes it easy to see the whole data model
 * at a glance, and means every other file can import from here instead of
 * redefining shapes inline.
 */

/** The five "lanes" (buckets) a schedule block can be placed into for a given day range. */
export type Lane = "RJF" | "SUPPLIERS" | "INTERNAL" | "CLIENT" | "LEAVE_TRACKER";

/** Human-readable labels for each lane, used anywhere we render lane names in the UI. */
export const LANE_LABELS: Record<Lane, string> = {
  RJF: "RJF (Agency)",
  SUPPLIERS: "Suppliers",
  INTERNAL: "Internal",
  CLIENT: "Client",
  LEAVE_TRACKER: "Leave Tracker",
};

/** Ordered list of lanes, so every part of the UI renders them in the same order. */
export const LANE_ORDER: Lane[] = ["RJF", "SUPPLIERS", "INTERNAL", "CLIENT", "LEAVE_TRACKER"];

/** Whether a schedule block/meeting happens online or offline (in person). Null = not applicable. */
export type Mode = "online" | "offline" | null;

/** A single row in a project's Deliverables table (Identifier / Description / Qty). */
export interface Deliverable {
  id: string;
  identifier: string;
  description: string;
  qty: number;
}

/** A team member who can be linked to schedule blocks (mainly for the Leave Tracker lane). */
export interface Person {
  id: string;
  name: string;
  role: string;
}

/**
 * A single draggable/resizable content block placed on the schedule grid.
 * Occupies one lane, on one or more consecutive days (startDate..endDate inclusive).
 */
export interface ScheduleBlock {
  id: string;
  lane: Lane;
  title: string;
  /** Optional smaller text shown under the title, e.g. "Client Review". */
  subHeading: string;
  /** ISO date string "YYYY-MM-DD", inclusive start of the block's span. */
  startDate: string;
  /** ISO date string "YYYY-MM-DD", inclusive end of the block's span. */
  endDate: string;
  /** Free text time range, e.g. "16:00-17:00". Kept as free text to match how the agency currently writes it. */
  timeRange: string;
  mode: Mode;
  /** One or more bullet lines, rendered with a "- " prefix (matches the original spreadsheet style). */
  notes: string[];
  /** Hex color or a named preset, used for the block's background. */
  color: string;
  /** Optional link to a Person - mainly used for Leave Tracker entries. */
  personId: string | null;
}

/** A single entry in the spanning "Phase" bar above the lanes (e.g. "Web Design", 8 Jun - 14 Jun). */
export interface PhaseBarEntry {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  color: string;
}

/** A full project: its header/meta info, date range, and everything on its schedule. */
export interface Project {
  id: string;
  projectCode: string;
  client: string;
  /** The header "Date" field from the original document (document issue date, not the schedule range). */
  date: string;
  scheduleVersion: string;
  projectName: string;
  brand: string;
  projectManager: string;
  producer: string;
  /** ISO date "YYYY-MM-DD" - first day shown on the schedule grid. */
  startDate: string;
  /** ISO date "YYYY-MM-DD" - last day shown on the schedule grid. */
  endDate: string;
  /** Editable long-form legal text, pre-filled with a sensible default on creation. */
  termsAndConditions: string;
  deliverables: Deliverable[];
  blocks: ScheduleBlock[];
  phaseBarEntries: PhaseBarEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Distinguishes a real gazetted public holiday from the agency's own office-closure days. */
export type HolidayType = "public_holiday" | "rjf_closed";

/** A single day (or one day of a multi-day range) shown in the auto-populated holiday row. */
export interface Holiday {
  /** ISO date "YYYY-MM-DD". */
  date: string;
  name: string;
  type: HolidayType;
}
