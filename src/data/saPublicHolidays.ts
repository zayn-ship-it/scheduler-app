/**
 * saPublicHolidays.ts
 * ---------------------------------------------------------------------------
 * Static, hand-maintained list of South African public holidays, used to
 * auto-populate the "Public Holiday" row on the schedule grid.
 *
 * IMPORTANT - MAINTENANCE NOTE:
 * There is no live holiday API in Phase 1, so this list must be manually
 * refreshed once a year. It currently covers 2026 and 2027. When adding a
 * new year:
 *   1. Confirm the official dates via the South African government gazette
 *      (gov.za) - several holidays move every year because they're tied to
 *      Easter (Good Friday, Family Day), and by law any holiday that falls
 *      on a Sunday is also observed on the following Monday.
 *   2. Add one { date, name, type: "public_holiday" } entry per day.
 *   3. Add this agency's own end-of-year office closure as
 *      { type: "rjf_closed" } entries so it renders in the same row -
 *      adjust the exact closure dates to match what's actually decided
 *      each year.
 *
 * The dates below were derived from the standard SA public holiday
 * calendar and Easter calculations - double-check them against the gazette
 * before relying on them for a real client-facing schedule.
 */
import type { Holiday } from "@/lib/storage/types";

export const saPublicHolidays: Holiday[] = [
  // ---- 2026 -----------------------------------------------------------
  { date: "2026-01-01", name: "New Year's Day", type: "public_holiday" },
  { date: "2026-03-21", name: "Human Rights Day", type: "public_holiday" },
  { date: "2026-04-03", name: "Good Friday", type: "public_holiday" },
  { date: "2026-04-06", name: "Family Day", type: "public_holiday" },
  { date: "2026-04-27", name: "Freedom Day", type: "public_holiday" },
  { date: "2026-05-01", name: "Workers' Day", type: "public_holiday" },
  { date: "2026-06-16", name: "Youth Day", type: "public_holiday" },
  { date: "2026-08-09", name: "National Women's Day", type: "public_holiday" },
  { date: "2026-08-10", name: "National Women's Day (observed)", type: "public_holiday" },
  { date: "2026-09-24", name: "Heritage Day", type: "public_holiday" },
  { date: "2026-12-16", name: "Day of Reconciliation", type: "public_holiday" },
  { date: "2026-12-25", name: "Christmas Day", type: "public_holiday" },
  { date: "2026-12-26", name: "Day of Goodwill", type: "public_holiday" },
  // Agency end-of-year office closure (adjust to match the real decision each year).
  { date: "2026-12-24", name: "RJF Closed", type: "rjf_closed" },
  { date: "2026-12-28", name: "RJF Closed", type: "rjf_closed" },
  { date: "2026-12-29", name: "RJF Closed", type: "rjf_closed" },
  { date: "2026-12-30", name: "RJF Closed", type: "rjf_closed" },
  { date: "2026-12-31", name: "RJF Closed", type: "rjf_closed" },

  // ---- 2027 -----------------------------------------------------------
  { date: "2027-01-01", name: "New Year's Day", type: "public_holiday" },
  { date: "2027-01-02", name: "RJF Closed", type: "rjf_closed" },
  { date: "2027-03-21", name: "Human Rights Day", type: "public_holiday" },
  { date: "2027-03-22", name: "Human Rights Day (observed)", type: "public_holiday" },
  { date: "2027-03-26", name: "Good Friday", type: "public_holiday" },
  { date: "2027-03-29", name: "Family Day", type: "public_holiday" },
  { date: "2027-04-27", name: "Freedom Day", type: "public_holiday" },
  { date: "2027-05-01", name: "Workers' Day", type: "public_holiday" },
  { date: "2027-06-16", name: "Youth Day", type: "public_holiday" },
  { date: "2027-08-09", name: "National Women's Day", type: "public_holiday" },
  { date: "2027-09-24", name: "Heritage Day", type: "public_holiday" },
  { date: "2027-12-16", name: "Day of Reconciliation", type: "public_holiday" },
  { date: "2027-12-25", name: "Christmas Day", type: "public_holiday" },
  { date: "2027-12-26", name: "Day of Goodwill", type: "public_holiday" },
  { date: "2027-12-27", name: "Day of Goodwill (observed)", type: "public_holiday" },
  { date: "2027-12-24", name: "RJF Closed", type: "rjf_closed" },
  { date: "2027-12-28", name: "RJF Closed", type: "rjf_closed" },
  { date: "2027-12-29", name: "RJF Closed", type: "rjf_closed" },
  { date: "2027-12-30", name: "RJF Closed", type: "rjf_closed" },
  { date: "2027-12-31", name: "RJF Closed", type: "rjf_closed" },
];

/** Looks up the holiday (if any) that falls on a specific ISO date. */
export function getHolidayForDate(dateIso: string): Holiday | undefined {
  return saPublicHolidays.find((h) => h.date === dateIso);
}
