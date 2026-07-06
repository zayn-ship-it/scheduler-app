/**
 * PeopleManagerPage.tsx
 * ---------------------------------------------------------------------------
 * Simple add/remove list of People (name + role), shared across all
 * projects. Mainly used to link names to Leave Tracker schedule blocks via
 * the "Linked person" field in BlockEditDialog.
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addPerson, getPeople, removePerson } from "@/lib/storage/peopleRepository";
import type { Person } from "@/lib/storage/types";
import { toast } from "sonner";

export function PeopleManagerPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    setPeople(getPeople());
  }, []);

  function handleAdd() {
    if (!name.trim()) return;
    addPerson({ name: name.trim(), role: role.trim() });
    setPeople(getPeople());
    setName("");
    setRole("");
    toast.success("Person added");
  }

  function handleRemove(person: Person) {
    const confirmed = window.confirm(`Remove "${person.name}"? Any schedule blocks linked to them will show as unlinked.`);
    if (!confirmed) return;
    removePerson(person.id);
    setPeople(getPeople());
    toast.success("Person removed");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-sm text-muted-foreground">Manage the team members available to link to Leave Tracker entries.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a person</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="person-name">
              Name
            </label>
            <Input id="person-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="person-role">
              Role
            </label>
            <Input id="person-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Designer" />
          </div>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No people added yet.</p>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {people.map((person) => (
              <div key={person.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{person.name}</p>
                  {person.role && <p className="text-xs text-muted-foreground">{person.role}</p>}
                </div>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(person)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
