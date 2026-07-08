/**
 * dateUtils.ts
 * ---------------------------------------------------------------------------
 * Date helpers shared across the app. Every date the app stores is an ISO
 * "YYYY-MM-DD" string (no time component) - these helpers convert between
 * that string form and JS Date objects, and do the day-counting math the
 * schedule grid and drag/resize logic depend on.
 *
 * Kept separate from any single component so both the back-office editing
 * grid and the read-only public view can share exactly the same date logic.
 */
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isValid,
} from "date-fns";

/** Formats a Date as "YYYY-MM-DD" (the format every stored date uses). */
export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parses a "YYYY-MM-DD" string into a Date. Throws if the string is not a valid date. */
export function fromIsoDate(iso: string): Date {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) {
    throw new Error(`dateUtils.fromIsoDate: "${iso}" is not a valid ISO date string`);
  }
  return parsed;
}

/** Today's date as an ISO "YYYY-MM-DD" string. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * Returns every day between `startIso` and `endIso` (inclusive) as an array of
 * ISO date strings. This is the array the ScheduleGrid uses to lay out one
 * column per day - every lane and the phase bar/holiday row iterate over this
 * same array so everything stays aligned.
 */
export function enumerateDays(startIso: string, endIso: string): string[] {
  const start = fromIsoDate(startIso);
  const end = fromIsoDate(endIso);
  const totalDays = differenceInCalendarDays(end, start);
  if (totalDays < 0) return [];
  const days: string[] = [];
  for (let i = 0; i <= totalDays; i++) {
    days.push(toIsoDate(addDays(start, i)));
  }
  return days;
}

/** Number of days a block spans, inclusive of both start and end (a same-day block = 1). */
export function spanLengthDays(startIso: string, endIso: string): number {
  return differenceInCalendarDays(fromIsoDate(endIso), fromIsoDate(startIso)) + 1;
}

/** Signed calendar-day difference between two ISO dates (`bIso - aIso`). */
export function daysBetween(aIso: string, bIso: string): number {
  return differenceInCalendarDays(fromIsoDate(bIso), fromIsoDate(aIso));
}

/** Shifts both dates of a range by `deltaDays` (negative = earlier, positive = later), preserving span length. */
export function shiftRange(
  startIso: string,
  endIso: string,
  deltaDays: number,
): { startDate: string; endDate: string } {
  return {
    startDate: toIsoDate(addDays(fromIsoDate(startIso), deltaDays)),
    endDate: toIsoDate(addDays(fromIsoDate(endIso), deltaDays)),
  };
}

/** Clamps a date range so it never falls outside `boundsStartIso`..`boundsEndIso`, preserving span length where possible. */
export function clampRangeToBounds(
  startIso: string,
  endIso: string,
  boundsStartIso: string,
  boundsEndIso: string,
): { startDate: string; endDate: string } {
  const boundsStart = fromIsoDate(boundsStartIso);
  const boundsEnd = fromIsoDate(boundsEndIso);
  let start = fromIsoDate(startIso);
  let end = fromIsoDate(endIso);
  const span = differenceInCalendarDays(end, start);

  if (start < boundsStart) {
    start = boundsStart;
    end = addDays(start, span);
  }
  if (end > boundsEnd) {
    end = boundsEnd;
    start = addDays(end, -span);
    if (start < boundsStart) start = boundsStart;
  }
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

/** Index of `dateIso` within `days` (an array from `enumerateDays`), or -1 if not found. */
export function dayIndex(days: string[], dateIso: string): number {
  return days.indexOf(dateIso);
}

/** Formats an ISO date as the grid header style used in the original document, e.g. "Mon - 8 Jun". */
export function formatDayHeader(dateIso: string): string {
  return format(fromIsoDate(dateIso), "EEE - d MMM");
}

/** Formats an ISO date for compact display elsewhere in the UI, e.g. "8 Jun 2026". */
export function formatDisplayDate(dateIso: string): string {
  return format(fromIsoDate(dateIso), "d MMM yyyy");
}
