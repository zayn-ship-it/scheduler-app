/**
 * useDragToScroll.ts
 * ---------------------------------------------------------------------------
 * Lets a horizontally-scrollable container be panned by clicking/tapping
 * anywhere on it and dragging left/right, in addition to whatever native
 * scrolling (trackpad, scrollbar, scroll-snap) it already supports - used by
 * the Dashboard drawer's two timeline views (PeopleWorkloadView.tsx,
 * ProjectPhasesView.tsx).
 *
 * A pointerdown that starts inside an interactive control (button, Select
 * trigger, input, link) is left alone so it can still be clicked normally -
 * only pointerdowns on the "empty" timeline surface start a pan.
 */
import { useEffect, type RefObject } from "react";

const INTERACTIVE_SELECTOR = 'button, [role="combobox"], [role="option"], input, a';

export function useDragToScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      if (event.target instanceof HTMLElement && event.target.closest(INTERACTIVE_SELECTOR)) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = el!.scrollLeft;
      el!.setPointerCapture(pointerId);
      el!.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging || event.pointerId !== pointerId) return;
      el!.scrollLeft = startScrollLeft - (event.clientX - startX);
    }

    function endDrag(event: PointerEvent) {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      el!.style.cursor = "grab";
      if (el!.hasPointerCapture(pointerId)) el!.releasePointerCapture(pointerId);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
    };
  }, [ref]);
}
