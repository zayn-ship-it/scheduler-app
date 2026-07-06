/**
 * SettingsPage.tsx
 * ---------------------------------------------------------------------------
 * App-wide settings, shared across all projects:
 * - People: team members available to link to Leave Tracker entries.
 * - Phase Titles: the master list of phase names + locked colours, picked
 *   from when adding a phase bar entry on a project's timeline.
 * - Terms & Conditions: the single global legal text shown on every
 *   project's public/live page.
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addPerson, getPeople, removePerson } from "@/lib/storage/peopleRepository";
import {
  addPhaseTitle,
  getPhaseTitles,
  removePhaseTitle,
} from "@/lib/storage/phaseTitleRepository";
import {
  getGlobalTermsAndConditions,
  updateGlobalTermsAndConditions,
} from "@/lib/storage/settingsRepository";
import type { Person, PhaseTitle } from "@/lib/storage/types";
import { COLOR_PRESETS } from "@/features/schedule/colorPresets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">App-wide settings shared across all projects.</p>
      </div>

      <PeopleSection />
      <PhaseTitlesSection />
      <TermsAndConditionsSection />
    </div>
  );
}

function PeopleSection() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    getPeople().then(setPeople);
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      await addPerson({ name: name.trim(), role: role.trim() });
      setPeople(await getPeople());
      setName("");
      setRole("");
      toast.success("Person added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add person");
    }
  }

  async function handleRemove(person: Person) {
    const confirmed = window.confirm(`Remove "${person.name}"? Any schedule blocks linked to them will show as unlinked.`);
    if (!confirmed) return;
    try {
      await removePerson(person.id);
      setPeople(await getPeople());
      toast.success("Person removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove person");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">People</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>

        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">No people added yet.</p>
        ) : (
          <div className="divide-y rounded-md border">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhaseTitlesSection() {
  const [phaseTitles, setPhaseTitles] = useState<PhaseTitle[]>([]);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].value);

  useEffect(() => {
    getPhaseTitles().then(setPhaseTitles);
  }, []);

  async function handleAdd() {
    if (!label.trim()) return;
    try {
      await addPhaseTitle({ label: label.trim(), color });
      setPhaseTitles(await getPhaseTitles());
      setLabel("");
      setColor(COLOR_PRESETS[0].value);
      toast.success("Phase title added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add phase title");
    }
  }

  async function handleRemove(title: PhaseTitle) {
    const confirmed = window.confirm(`Remove "${title.label}"? Any phases using it will show as "Unknown phase".`);
    if (!confirmed) return;
    try {
      await removePhaseTitle(title.id);
      setPhaseTitles(await getPhaseTitles());
      toast.success("Phase title removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove phase title");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phase Titles</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="phase-title-label">
              Title
            </label>
            <Input id="phase-title-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Web Design" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Colour</span>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={cn(
                    "size-7 rounded-full border-2",
                    color === preset.value ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!label.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        {phaseTitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phase titles added yet.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {phaseTitles.map((title) => (
              <div key={title.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: title.color }} />
                  <p className="text-sm font-medium">{title.label}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(title)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TermsAndConditionsSection() {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getGlobalTermsAndConditions().then((t) => {
      setText(t);
      setLoaded(true);
    });
  }, []);

  async function handleSave() {
    try {
      await updateGlobalTermsAndConditions(text);
      toast.success("Terms & Conditions saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save Terms & Conditions");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Shown on every project's public/live page.</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} disabled={!loaded} />
        <Button className="self-start" onClick={handleSave} disabled={!loaded}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
