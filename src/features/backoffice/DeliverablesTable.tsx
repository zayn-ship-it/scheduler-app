/**
 * DeliverablesTable.tsx
 * ---------------------------------------------------------------------------
 * Editable table of a project's Deliverables (Identifier / Description /
 * Duration / Aspect Ratio / Qty / Completed), matching the "MAIN PIECE
 * DELIVERABLES" table from the original spreadsheet.
 *
 * Unlike most of this page, this table is self-persisting - each field save
 * calls straight into projectRepository (addDeliverable/updateDeliverable/
 * removeDeliverable) and then tells the parent to re-read the project, the
 * same pattern already used by PhaseBar.tsx/LaneRow.tsx/BlockEditDialog.tsx.
 * Text/number fields persist on blur; the Completed checkbox persists
 * immediately on toggle.
 */
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addDeliverable, removeDeliverable, updateDeliverable } from "@/lib/storage/projectRepository";
import type { Deliverable } from "@/lib/storage/types";
import { toast } from "sonner";

interface DeliverablesTableProps {
  projectId: string;
  deliverables: Deliverable[];
  onProjectChanged: () => void;
}

export function DeliverablesTable({ projectId, deliverables, onProjectChanged }: DeliverablesTableProps) {
  const [rows, setRows] = useState(deliverables);

  useEffect(() => {
    setRows(deliverables);
  }, [deliverables]);

  function updateLocalRow(id: string, patch: Partial<Deliverable>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function persistRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    try {
      await updateDeliverable(projectId, row);
      onProjectChanged();
    } catch (error) {
      console.error("Failed to save deliverable:", error);
      toast.error("Failed to save deliverable");
    }
  }

  async function handleToggleCompleted(row: Deliverable, completed: boolean) {
    updateLocalRow(row.id, { completed });
    try {
      await updateDeliverable(projectId, { ...row, completed });
      onProjectChanged();
    } catch (error) {
      console.error("Failed to save deliverable:", error);
      toast.error("Failed to save deliverable");
    }
  }

  async function addRow() {
    try {
      await addDeliverable(projectId, {
        identifier: "",
        description: "",
        qty: 1,
        duration: "",
        aspectRatio: "",
        completed: false,
      });
      onProjectChanged();
    } catch (error) {
      console.error("Failed to add deliverable:", error);
      toast.error("Failed to add deliverable");
    }
  }

  async function removeRow(id: string) {
    try {
      await removeDeliverable(projectId, id);
      onProjectChanged();
    } catch (error) {
      console.error("Failed to remove deliverable:", error);
      toast.error("Failed to remove deliverable");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Identifier</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Duration</TableHead>
            <TableHead className="w-24">Aspect Ratio</TableHead>
            <TableHead className="w-20">Qty</TableHead>
            <TableHead className="w-16 text-center">Done</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  value={row.identifier}
                  placeholder="WEB001"
                  onChange={(e) => updateLocalRow(row.id, { identifier: e.target.value })}
                  onBlur={() => persistRow(row.id)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.description}
                  placeholder="Single Page Squeeze Page (Webflow)"
                  onChange={(e) => updateLocalRow(row.id, { description: e.target.value })}
                  onBlur={() => persistRow(row.id)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.duration}
                  placeholder="30s"
                  onChange={(e) => updateLocalRow(row.id, { duration: e.target.value })}
                  onBlur={() => persistRow(row.id)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.aspectRatio}
                  placeholder="16:9"
                  onChange={(e) => updateLocalRow(row.id, { aspectRatio: e.target.value })}
                  onBlur={() => persistRow(row.id)}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={row.qty}
                  onChange={(e) => updateLocalRow(row.id, { qty: Number(e.target.value) })}
                  onBlur={() => persistRow(row.id)}
                />
              </TableCell>
              <TableCell className="text-center">
                <Checkbox
                  checked={row.completed}
                  onCheckedChange={(checked) => handleToggleCompleted(row, checked === true)}
                />
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)}>
                  <Icon name="delete" size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button size="sm" variant="outline" onClick={addRow} className="self-start">
        <Icon name="add" size={16} />
        Add Deliverable
      </Button>
    </div>
  );
}
