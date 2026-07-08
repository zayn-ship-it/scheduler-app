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
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addPerson, getPeople, removePerson, updatePerson } from "@/lib/storage/peopleRepository";
import {
  addPhaseTitle,
  getPhaseTitles,
  removePhaseTitle,
  updatePhaseTitle,
} from "@/lib/storage/phaseTitleRepository";
import {
  addLaneTitleOption,
  getLaneTitleOptions,
  removeLaneTitleOption,
  updateLaneTitleOption,
} from "@/lib/storage/laneTitleOptionRepository";
import {
  getGlobalTermsAndConditions,
  updateGlobalTermsAndConditions,
} from "@/lib/storage/settingsRepository";
import { LANE_LABELS, type Lane, type LaneTitleOption, type Person, type PhaseTitle } from "@/lib/storage/types";
import { COLOR_PRESETS, PHASE_COLOR_PRESETS } from "@/features/schedule/colorPresets";
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
      <BlockTitlesSection />
      <TermsAndConditionsSection />
    </div>
  );
}

function PeopleSection() {
  const [people, setPeople] = useState<Person[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    getPeople().then(setPeople);
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setRole("");
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setName(person.name);
    setRole(person.role);
  }

  async function handleSave() {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updatePerson({ id: editingId, name: name.trim(), role: role.trim() });
        toast.success("Person updated");
      } else {
        await addPerson({ name: name.trim(), role: role.trim() });
        toast.success("Person added");
      }
      setPeople(await getPeople());
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save person");
    }
  }

  async function handleRemove(person: Person) {
    const confirmed = window.confirm(`Remove "${person.name}"? Any schedule blocks linked to them will show as unlinked.`);
    if (!confirmed) return;
    try {
      await removePerson(person.id);
      setPeople(await getPeople());
      if (editingId === person.id) resetForm();
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
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Icon name="add" size={16} />
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(person)}>
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(person)}>
                    <Icon name="delete" size={16} />
                  </Button>
                </div>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getPhaseTitles().then(setPhaseTitles);
  }, []);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setColor(COLOR_PRESETS[0].value);
    setNotes("");
  }

  function startEdit(title: PhaseTitle) {
    setEditingId(title.id);
    setLabel(title.label);
    setColor(title.color);
    setNotes(title.notes);
  }

  async function handleSave() {
    if (!label.trim()) return;
    try {
      if (editingId) {
        await updatePhaseTitle({ id: editingId, label: label.trim(), color, notes: notes.trim() });
        toast.success("Phase title updated");
      } else {
        await addPhaseTitle({ label: label.trim(), color, notes: notes.trim() });
        toast.success("Phase title added");
      }
      setPhaseTitles(await getPhaseTitles());
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save phase title");
    }
  }

  async function handleRemove(title: PhaseTitle) {
    const confirmed = window.confirm(`Remove "${title.label}"? Any phases using it will show as "Unknown phase".`);
    if (!confirmed) return;
    try {
      await removePhaseTitle(title.id);
      setPhaseTitles(await getPhaseTitles());
      if (editingId === title.id) resetForm();
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
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="phase-title-label">
                Title
              </label>
              <Input id="phase-title-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Web Design" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Colour</span>
              <div className="flex max-w-xs flex-wrap gap-2">
                {PHASE_COLOR_PRESETS.map((preset) => (
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
            <Button onClick={handleSave} disabled={!label.trim()}>
              <Icon name="add" size={16} />
              {editingId ? "Save changes" : "Add"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="phase-title-notes">
              Notes (internal only, never shown on the live link)
            </label>
            <Textarea
              id="phase-title-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Use this for the initial concept round only"
            />
          </div>
        </div>

        {phaseTitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phase titles added yet.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {phaseTitles.map((title) => (
              <div key={title.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: title.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{title.label}</p>
                    {title.notes && <p className="truncate text-xs text-muted-foreground">{title.notes}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(title)}>
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(title)}>
                    <Icon name="delete" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CONFIGURABLE_LANES: Lane[] = ["RJF", "SUPPLIERS", "INTERNAL", "CLIENT"];

function BlockTitlesSection() {
  const [lane, setLane] = useState<Lane>(CONFIGURABLE_LANES[0]);
  const [options, setOptions] = useState<LaneTitleOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    getLaneTitleOptions().then(setOptions);
  }, []);

  const optionsForLane = options.filter((o) => o.lane === lane);

  function resetForm() {
    setEditingId(null);
    setLabel("");
  }

  function startEdit(option: LaneTitleOption) {
    setEditingId(option.id);
    setLane(option.lane);
    setLabel(option.label);
  }

  async function handleSave() {
    if (!label.trim()) return;
    try {
      if (editingId) {
        await updateLaneTitleOption({ id: editingId, lane, label: label.trim() });
        toast.success("Title option updated");
      } else {
        await addLaneTitleOption({ lane, label: label.trim() });
        toast.success("Title option added");
      }
      setOptions(await getLaneTitleOptions());
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save title option");
    }
  }

  async function handleRemove(option: LaneTitleOption) {
    try {
      await removeLaneTitleOption(option.id);
      setOptions(await getLaneTitleOptions());
      if (editingId === option.id) resetForm();
      toast.success("Title option removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove title option");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Block Titles</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Set a preset list of titles for a lane and its block edit dialog switches from free text to a dropdown of
          just these options. Leave Tracker isn't configurable here - its blocks are picked by person instead.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Lane</span>
            <Select value={lane} onValueChange={(v) => setLane(v as Lane)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIGURABLE_LANES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LANE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="lane-title-label">
              Title
            </label>
            <Input id="lane-title-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Client Review" />
          </div>
          <Button onClick={handleSave} disabled={!label.trim()}>
            <Icon name="add" size={16} />
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>

        {optionsForLane.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No title options set for {LANE_LABELS[lane]} yet - its block edit dialog will use free text until you add
            some here.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {optionsForLane.map((option) => (
              <div key={option.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium">{option.label}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(option)}>
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(option)}>
                    <Icon name="delete" size={16} />
                  </Button>
                </div>
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
