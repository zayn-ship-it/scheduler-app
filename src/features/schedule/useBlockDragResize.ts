/**
 * useBlockDragResize.ts
 * ---------------------------------------------------------------------------
 * Encapsulates the drag-to-move and drag-edge-to-resize interaction for a
 * single ScheduleBlock. This is the trickiest piece of interaction logic in
 * the app, so it's isolated here with heavy commenting rather than inlined
 * into ScheduleBlock.tsx.
 *
 * How it works, in plain terms:
 * - We use raw Pointer Events (pointerdown/pointermove/pointerup) rather
 *   than a drag-and-drop library, because all we actually need is "how many
 *   pixels has the pointer moved horizontally since the drag started" - a
 *   full DnD library would add complexity (drop zones, sensors, collision
 *   detection) that this simple case doesn't need.
 * - Every day column has a fixed pixel width (DAY_COLUMN_WIDTH_PX). So a
 *   pixel delta converts to a "day delta" just by dividing and rounding to
 *   the nearest whole day - the block always snaps to whole days, never a
 *   fractional position.
 * - While the pointer is down, we do NOT write to storage. We only track the
 *   day delta in local state and let the component render a "preview"
 *   position. This keeps dragging smooth (no repeated localStorage writes)
 *   and means the drag can still be "committed" as one clean update.
 * - On pointerup we compute the final start/end dates, clamp them so the
 *   block can never be dragged/resized outside the project's own date
 *   range, and call `onCommit` exactly once with the final dates - that's
 *   the only point at which the caller should persist the change.
 *
 * Three interaction modes:
 * - "move": dragging the block's body. Both startDate and endDate shift by
 *   the same number of days, so the block's length never changes - this is
 *   the "snake across the dates" behaviour for e.g. a client delay.
 * - "resize-left": dragging the left edge handle. Only startDate moves;
 *   endDate is fixed. Can't push startDate past endDate (minimum 1-day span).
 * - "resize-right": dragging the right edge handle. Only endDate moves;
 *   startDate is fixed.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { clampRangeToBounds, fromIsoDate, shiftRange, toIsoDate } from "@/lib/dateUtils";
import { DAY_COLUMN_WIDTH_PX } from "./gridConstants";

export type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  mode: DragMode;
  pointerId: number;
  startClientX: number;
  originStartDate: string;
  originEndDate: string;
  deltaDays: number;
}

interface UseBlockDragResizeArgs {
  startDate: string;
  endDate: string;
  /** The project's own date range - a block can never be dragged/resized outside of it. */
  bounds: { startDate: string; endDate: string };
  /** Called exactly once, on drop, with the final computed dates. */
  onCommit: (range: { startDate: string; endDate: string }) => void;
  /** When true, dragging/resizing is disabled entirely (used for the read-only public view). */
  disabled?: boolean;
}

export function useBlockDragResize({ startDate, endDate, bounds, onCommit, disabled }: UseBlockDragResizeArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const beginDrag = useCallback(
    (mode: DragMode) => (event: React.PointerEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      setDrag({
        mode,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        originStartDate: startDate,
        originEndDate: endDate,
        deltaDays: 0,
      });
    },
    [disabled, startDate, endDate],
  );

  useEffect(() => {
    if (!drag) return;

    function handlePointerMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const deltaPx = event.clientX - current.startClientX;
      const deltaDays = Math.round(deltaPx / DAY_COLUMN_WIDTH_PX);
      setDrag({ ...current, deltaDays });
    }

    function handlePointerUp(event: PointerEvent) {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      onCommit(computeFinalRange(current, bounds));
      setDrag(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, bounds, onCommit]);

  const previewRange = drag ? computeFinalRange(drag, bounds) : { startDate, endDate };

  return {
    isDragging: drag !== null,
    previewStartDate: previewRange.startDate,
    previewEndDate: previewRange.endDate,
    onBodyPointerDown: beginDrag("move"),
    onLeftHandlePointerDown: beginDrag("resize-left"),
    onRightHandlePointerDown: beginDrag("resize-right"),
  };
}

/** Pure function: given the in-progress drag state, compute what the block's dates would be right now. */
function computeFinalRange(
  drag: DragState,
  bounds: { startDate: string; endDate: string },
): { startDate: string; endDate: string } {
  const { mode, originStartDate, originEndDate, deltaDays } = drag;

  if (mode === "move") {
    const shifted = shiftRange(originStartDate, originEndDate, deltaDays);
    return clampRangeToBounds(shifted.startDate, shifted.endDate, bounds.startDate, bounds.endDate);
  }

  if (mode === "resize-left") {
    let newStart = toIsoDate(addDaysRaw(originStartDate, deltaDays));
    if (newStart > originEndDate) newStart = originEndDate; // minimum 1-day span
    if (newStart < bounds.startDate) newStart = bounds.startDate;
    return { startDate: newStart, endDate: originEndDate };
  }

  // resize-right
  let newEnd = toIsoDate(addDaysRaw(originEndDate, deltaDays));
  if (newEnd < originStartDate) newEnd = originStartDate; // minimum 1-day span
  if (newEnd > bounds.endDate) newEnd = bounds.endDate;
  return { startDate: originStartDate, endDate: newEnd };
}

function addDaysRaw(iso: string, days: number): Date {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return date;
}
