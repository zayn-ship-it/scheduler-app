/**
 * peopleRepository.ts
 * ---------------------------------------------------------------------------
 * The ONLY module that knows where/how People are stored (mirrors the
 * pattern in projectRepository.ts). People are a simple flat list shared
 * across all projects - used mainly to link names to Leave Tracker entries.
 */
import { readJson, writeJson } from "./localStorageClient";
import type { Person } from "./types";

const STORAGE_KEY = "schedule-app:people";

/** Returns every stored person, alphabetically by name. */
export function getPeople(): Person[] {
  const people = readJson<Person[]>(STORAGE_KEY, []);
  return [...people].sort((a, b) => a.name.localeCompare(b.name));
}

export function getPersonById(id: string): Person | undefined {
  return getPeople().find((p) => p.id === id);
}

/** Adds a new person and persists the list. Returns the created person. */
export function addPerson(input: Omit<Person, "id">): Person {
  const person: Person = { ...input, id: crypto.randomUUID() };
  const all = getPeople();
  all.push(person);
  writeJson(STORAGE_KEY, all);
  return person;
}

/** Updates an existing person's fields (matched by id). No-op if not found. */
export function updatePerson(updated: Person): void {
  const all = getPeople();
  const index = all.findIndex((p) => p.id === updated.id);
  if (index === -1) return;
  all[index] = updated;
  writeJson(STORAGE_KEY, all);
}

/** Removes a person by id. Note: this does NOT clean up any ScheduleBlock.personId references that pointed to them -
 *  the UI should treat a dangling personId as "unknown person" (see PeopleManagerPage) rather than silently
 *  cascading deletes across projects, so removing a person never surprises the user by editing their schedules. */
export function removePerson(id: string): void {
  writeJson(STORAGE_KEY, getPeople().filter((p) => p.id !== id));
}
