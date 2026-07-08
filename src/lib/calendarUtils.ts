/**
 * calendarUtils.ts
 * ---------------------------------------------------------------------------
 * Helpers specific to the public client-facing MONTH CALENDAR view
 * (src/features/public/PublicMonthCalendar.tsx + MonthWeekRow.tsx).
 *
 * This is deliberately separate from dateUtils.ts, which serves the
 * back-office's continuous horizontal timeline. The calendar view has a
 * different shape entirely: full Mon-Sun week rows grouped into a
 * traditional month grid with prev/next navigation - none of which the
 * timeline editor needs.
 */
import { addDays, addMonths as addMonthsDf, endOfMonth, format, startOfMonth } from "date-fns";
import { fromIsoDate, toIsoDate } from "@/lib/dateUtils";
import type { Project } from "@/lib/storage/types";

/** ISO date -> the first day of that date's month, as an ISO date string. Used as the "month anchor". */
export function toMonthAnchor(dateIso: string): string {
  return toIsoDate(startOfMonth(fromIsoDate(dateIso)));
}

/** Shifts a month anchor by `delta` months (negative = earlier). */
export function addMonths(monthAnchorIso: string, delta: number): string {
  return toIsoDate(addMonthsDf(fromIsoDate(monthAnchorIso), delta));
}

/** "June 2026" style label for the calendar header. */
export function formatMonthLabel(monthAnchorIso: string): string {
  return format(fromIsoDate(monthAnchorIso), "MMMM yyyy");
}

/** True if `dateIso` falls within the same calendar month as `monthAnchorIso`. */
export function isDateInMonth(dateIso: string, monthAnchorIso: string): boolean {
  return dateIso.slice(0, 7) === monthAnchorIso.slice(0, 7);
}

/**
 * Builds the full month grid for `monthAnchorIso`: an array of week rows,
 * each row exactly 7 ISO dates (Mon-Sun). A block spanning a weekend runs
 * straight across it like any other pair of adjacent days.
 *
 * The first and last rows may include a few days from the adjacent month so
 * every row is a complete Mon-Sun week - callers should dim those using
 * `isDateInMonth`.
 */
export function getMonthWeekdayGrid(monthAnchorIso: string): string[][] {
  const monthStart = startOfMonth(fromIsoDate(monthAnchorIso));
  const monthEnd = endOfMonth(monthStart);

  // Walk backward from the 1st to the Monday of that week (getDay: 0=Sun..6=Sat).
  const leadInDays = (monthStart.getDay() + 6) % 7; // days since most recent Monday
  const gridStart = addDays(monthStart, -leadInDays);

  // Walk forward from the last day of the month to the Sunday of that week.
  const trailOutDays = (7 - monthEnd.getDay()) % 7;
  const gridEnd = addDays(monthEnd, trailOutDays);

  const weeks: string[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toIsoDate(addDays(cursor, i)));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7); // next Monday
  }
  return weeks;
}

/**
 * Default month to show when a client first opens their link: the month
 * containing today, if today falls within the project's date range;
 * otherwise the project's start month (e.g. an upcoming project not yet
 * underway defaults to its first month rather than today's, which could be
 * before the project even starts).
 */
export function getDefaultVisibleMonth(project: Pick<Project, "startDate" | "endDate">): string {
  const today = toIsoDate(new Date());
  if (today >= project.startDate && today <= project.endDate) {
    return toMonthAnchor(today);
  }
  return toMonthAnchor(project.startDate);
}

/**
 * Clips a block's [start, end] date range to one week row's [rowStart, rowEnd]
 * window. Returns null if the block doesn't touch this row at all. This is
 * the core trick that makes multi-week/weekend-spanning blocks "just work":
 * each row independently intersects the block's real dates against its own
 * Mon-Fri window using plain ISO string comparison (ISO "YYYY-MM-DD" strings
 * sort exactly like their dates), so a block running Thu->Mon produces a
 * Thu-Fri segment in one row and a Mon segment in the next with no
 * special-casing for the weekend in between.
 */
export function clipRangeToRow(
  blockStart: string,
  blockEnd: string,
  rowStart: string,
  rowEnd: string,
): { start: string; end: string; continuesBefore: boolean; continuesAfter: boolean } | null {
  if (blockEnd < rowStart || blockStart > rowEnd) return null;
  const start = blockStart > rowStart ? blockStart : rowStart;
  const end = blockEnd < rowEnd ? blockEnd : rowEnd;
  return {
    start,
    end,
    // "continues" flags drop the rounded corner on that side, as a visual cue that the bar carries on
    // into the previous/next row rather than actually starting/ending here.
    continuesBefore: blockStart < rowStart,
    continuesAfter: blockEnd > rowEnd,
  };
}
