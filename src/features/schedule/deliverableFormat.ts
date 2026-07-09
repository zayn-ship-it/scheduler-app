import type { BlockLink, Deliverable, ScheduleBlock } from "@/lib/storage/types";

/** A deliverable rendered as a single line, e.g. "Squeeze Page · 30s · 16:9 · Qty 2" - description only, no identifier code. */
export function deliverableLine(deliverable: Deliverable): string {
  const meta = [deliverable.duration, deliverable.aspectRatio, `Qty ${deliverable.qty}`].filter(Boolean).join(" · ");
  return meta ? `${deliverable.description} · ${meta}` : deliverable.description;
}

/** A link's display text: its own custom label if set, otherwise a sensible default. */
export function linkDisplayLabel(link: BlockLink): string {
  return link.label || "Open meeting link";
}

/** A block's combined information: its own free-text lines, then each attached deliverable as its own line. */
export function infoLines(block: ScheduleBlock, deliverablesById: Map<string, Deliverable>): string[] {
  const attached = block.deliverableIds
    .map((id) => deliverablesById.get(id))
    .filter((d): d is Deliverable => Boolean(d))
    .map(deliverableLine);
  return [...block.information, ...attached];
}
