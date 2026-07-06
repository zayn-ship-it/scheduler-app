/**
 * peopleRepository.ts
 * ---------------------------------------------------------------------------
 * Uses Supabase as the backend for storing people (team members).
 */
import { supabase } from "./supabaseClient";
import type { Person } from "./types";

export async function getPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[peopleRepository] getPeople error:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
  }));
}

export async function getPersonById(id: string): Promise<Person | undefined> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[peopleRepository] getPersonById error:", error);
    return undefined;
  }

  return data ? { id: data.id, name: data.name, role: data.role } : undefined;
}

export async function addPerson(input: Omit<Person, "id">): Promise<Person> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("people").insert({
    id,
    name: input.name,
    role: input.role,
  });

  if (error) throw error;
  return { ...input, id };
}

export async function updatePerson(updated: Person): Promise<void> {
  const { error } = await supabase
    .from("people")
    .update({
      name: updated.name,
      role: updated.role,
    })
    .eq("id", updated.id);

  if (error) throw error;
}

export async function removePerson(id: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}
