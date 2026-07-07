/**
 * ScheduleBlock.tsx
 * ---------------------------------------------------------------------------
 * A single draggable/resizable card on the schedule grid, positioned
 * absolutely within its lane's day-track based on its start/end dates (see
 * gridConstants.ts for the shared column width all positioning math uses).
 *
 * - Clicking the block body (without dragging) opens the full edit dialog.
 * - Dragging the block body moves it (see useBlockDragResize.ts).
 * - Dragging the thin handles at the left/right edges resizes it.
 * - In read-only mode (public view) all drag/resize/click-to-edit behaviour
 *   is disabled - it's purely a display card.
 *
 * A plain click and a "mouse down, drag, mouse up" both end by firing a
 * native `click` event on this element - the browser doesn't distinguish
 * them. `useBlockDragResize`'s drag state is reset to `false` the instant
 * the pointer is released, which happens *before* that trailing click
 * fires, so checking `isDragging` in the click handler doesn't actually
 * catch a just-finished drag. Instead we track in `justDraggedRef` whether
 * the interaction that's ending actually changed the block's dates, and use
 * that (not React state) to decide whether the click should open the edit
 * dialog.
 */
import { useRef, useState, useEffect } from "react";
import { updateBlock } from "@/lib/storage/projectRepository";
import { getPersonById } from "@/lib/storage/peopleRepository";
import type { Deliverable, ScheduleBlock as ScheduleBlockType } from "@/lib/storage/types";
import { dayIndex, spanLengthDays } from "@/lib/dateUtils";
import { DAY_COLUMN_WIDTH_PX, BLOCK_ROW_HEIGHT_PX } from "./gridConstants";
import { useBlockDragResize } from "./useBlockDragResize";
import { BlockEditDialog } from "./BlockEditDialog";
import { getContrastTextColor } from "./colorPresets";
import { cn } from "@/lib/utils";

interface ScheduleBlockProps {
  projectId: string;
  block: ScheduleBlockType;
  deliverables: Deliverable[];
  days: string[];
  bounds: { startDate: string; endDate: string };
  rowIndex: number;
  readOnly: boolean;
  onProjectChanged: () => void;
}

export function ScheduleBlock({
  projectId,
  block,
  deliverables,
  days,
  bounds,
  rowIndex,
  readOnly,
  onProjectChanged,
}: ScheduleBlockProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [person, setPerson] = useState<any | undefined>(undefined);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (block.personId) {
      getPersonById(block.personId).then(setPerson);
    } else {
      setPerson(undefined);
    }
  }, [block.personId]);

  const { isDragging, previewStartDate, previewEndDate, onBodyPointerDown, onLeftHandlePointerDown, onRightHandlePointerDown } =
    useBlockDragResize({
      startDate: block.startDate,
      endDate: block.endDate,
      bounds,
      disabled: readOnly,
      onCommit: async (range) => {
        justDraggedRef.current = range.startDate !== block.startDate || range.endDate !== block.endDate;
        try {
          await updateBlock(projectId, { ...block, ...range });
          onProjectChanged();
        } catch (error) {
          console.error("Failed to update block:", error);
        }
      },
    });

  const startIdx = Math.max(dayIndex(days, previewStartDate), 0);
  const span = spanLengthDays(previewStartDate, previewEndDate);
  const isNeutralLane = block.lane === "INTERNAL" || block.lane === "SUPPLIERS" || block.lane === "LEAVE_TRACKER";
  const textColor = isNeutralLane ? undefined : getContrastTextColor(block.color);
  const isDarkText = textColor === "#0f172a";

  return (
    <>
      <div
        className={cn(
          "group absolute flex flex-col justify-center overflow-hidden rounded-md px-2 py-1 shadow-sm select-none",
          isNeutralLane && "border border-foreground/30 bg-transparent text-foreground",
          !readOnly && "cursor-grab active:cursor-grabbing",
          isDragging && "z-30 opacity-90 shadow-lg",
        )}
        style={{
          left: startIdx * DAY_COLUMN_WIDTH_PX + 2,
          width: span * DAY_COLUMN_WIDTH_PX - 4,
          top: rowIndex * BLOCK_ROW_HEIGHT_PX + 2,
          height: BLOCK_ROW_HEIGHT_PX - 4,
          backgroundColor: isNeutralLane ? undefined : block.color,
          color: textColor,
        }}
        onPointerDown={onBodyPointerDown}
        onClick={() => {
          if (readOnly || isDragging) return;
          // Swallow the click that trails an actual drag/resize - only open the dialog for a real, un-dragged click.
          if (justDraggedRef.current) {
            justDraggedRef.current = false;
            return;
          }
          setIsEditOpen(true);
        }}
        title={block.title}
      >
        {!readOnly && (
          <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
            onPointerDown={onLeftHandlePointerDown}
          >
            <div className={cn("mx-auto h-full w-0.5", isNeutralLane ? "bg-foreground/40" : isDarkText ? "bg-black/40" : "bg-white/70")} />
          </div>
        )}

        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-semibold leading-tight">{block.title || "(untitled)"}</p>
          {(block.timeRange || block.mode) && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[9px] leading-tight",
                isNeutralLane || isDarkText ? "border-foreground/40" : "border-white/70",
              )}
            >
              {[block.timeRange, block.mode].filter(Boolean).join("  ")}
            </span>
          )}
        </div>
        {person?.name && <p className="truncate text-[10px] leading-tight opacity-80">{person.name}</p>}

        {!readOnly && (
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
            onPointerDown={onRightHandlePointerDown}
          >
            <div className={cn("mx-auto h-full w-0.5", isNeutralLane ? "bg-foreground/40" : isDarkText ? "bg-black/40" : "bg-white/70")} />
          </div>
        )}
      </div>

      {isEditOpen && (
        <BlockEditDialog
          projectId={projectId}
          block={block}
          bounds={bounds}
          deliverables={deliverables}
          onClose={() => setIsEditOpen(false)}
          onSaved={onProjectChanged}
        />
      )}
    </>
  );
}
