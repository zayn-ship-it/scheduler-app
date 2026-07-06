/**
 * DeliverablesTable.tsx
 * ---------------------------------------------------------------------------
 * Editable table of a project's Deliverables (Identifier / Description /
 * Qty), matching the "MAIN PIECE DELIVERABLES" table from the original
 * spreadsheet. Fully controlled - the parent (ProjectFormPage) owns the
 * array and passes down `onChange` to receive edits.
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Deliverable } from "@/lib/storage/types";

interface DeliverablesTableProps {
  deliverables: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
}

export function DeliverablesTable({ deliverables, onChange }: DeliverablesTableProps) {
  function addRow() {
    onChange([...deliverables, { id: crypto.randomUUID(), identifier: "", description: "", qty: 1 }]);
  }

  function updateRow(id: string, patch: Partial<Deliverable>) {
    onChange(deliverables.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeRow(id: string) {
    onChange(deliverables.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Identifier</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Qty</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliverables.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  value={row.identifier}
                  placeholder="WEB001"
                  onChange={(e) => updateRow(row.id, { identifier: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.description}
                  placeholder="Single Page Squeeze Page (Webflow)"
                  onChange={(e) => updateRow(row.id, { description: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button size="sm" variant="outline" onClick={addRow} className="self-start">
        <Plus className="size-4" />
        Add Deliverable
      </Button>
    </div>
  );
}
