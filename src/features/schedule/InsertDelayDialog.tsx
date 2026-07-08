/**
 * InsertDelayDialog.tsx
 * ---------------------------------------------------------------------------
 * Minimal confirm dialog for inserting a "delay" block (RJF/Client lanes
 * only). Picks a date (defaulting to whatever day was clicked/seeded), then
 * calls `insertDelayBlock`, which snapshots the current schedule as a new
 * version, inserts the 1-day delay marker, and shifts every other RJF/Client
 * block + phase bar entry on/after that date forward by a day.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { insertDelayBlock } from "@/lib/storage/projectRepository";

export function InsertDelayDialog({
  projectId,
  lane,
  seedDate,
  onClose,
  onSaved,
}: {
  projectId: string;
  lane: "RJF" | "CLIENT";
  seedDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(seedDate);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await insertDelayBlock(projectId, lane, date);
      toast.success("Delay inserted - schedule shifted forward by a day, previous state saved as a version");
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to insert delay:", error);
      toast.error("Failed to insert delay");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Delay</DialogTitle>
          <DialogDescription>
            Adds a 1-day delay marker on this date and shifts every RJF/Client block and phase on or
            after it forward by one day. The current schedule is saved as a version first, so you can
            still look back at it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={saving}>
            Insert Delay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
