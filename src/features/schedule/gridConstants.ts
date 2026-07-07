/**
 * gridConstants.ts
 * ---------------------------------------------------------------------------
 * Shared pixel sizing for the schedule grid, used by every row component
 * (header, holidays, phase bar, lanes) so all rows line up into the same
 * day columns, and by the drag/resize hook so it can convert pixel deltas
 * into "number of days" using the same column width.
 */

/** Width of a single day column, in pixels. */
export const DAY_COLUMN_WIDTH_PX = 110;

/** Width of the sticky left-hand label column (lane names, row labels). */
export const LANE_LABEL_WIDTH_PX = 150;

/** Height of a single stacked "row" within a lane, when multiple blocks overlap in date range. Tall enough to show a few attached information/deliverable lines. */
export const BLOCK_ROW_HEIGHT_PX = 96;
