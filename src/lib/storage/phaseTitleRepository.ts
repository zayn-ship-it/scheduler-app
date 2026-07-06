/**
 * phaseTitleRepository.ts
 * ---------------------------------------------------------------------------
 * Uses Supabase as the backend for the global master list of phase titles
 * (managed on the Settings page, picked from when adding a phase bar entry
 * to a project).
 */
import { supabase } from "./supabaseClient";
import type { PhaseTitle } from "./types";

export async function getPhaseTitles(): Promise<PhaseTitle[]> {
  const { data, error } = await supabase
    .from("phase_titles")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    console.error("[phaseTitleRepository] getPhaseTitles error:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    label: p.label,
    color: p.color,
  }));
}

export async function addPhaseTitle(input: Omit<PhaseTitle, "id">): Promise<PhaseTitle> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("phase_titles").insert({
    id,
    label: input.label,
    color: input.color,
  });

  if (error) throw error;
  return { ...input, id };
}

export async function updatePhaseTitle(updated: PhaseTitle): Promise<void> {
  const { error } = await supabase
    .from("phase_titles")
    .update({
      label: updated.label,
      color: updated.color,
    })
    .eq("id", updated.id);

  if (error) throw error;
}

export async function removePhaseTitle(id: string): Promise<void> {
  const { error } = await supabase.from("phase_titles").delete().eq("id", id);
  if (error) throw error;
}
