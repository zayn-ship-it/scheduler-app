/**
 * laneTitleOptionRepository.ts
 * ---------------------------------------------------------------------------
 * Uses Supabase as the backend for the per-lane master lists of preset block
 * titles (managed on the Settings page), offered as a dropdown in
 * BlockEditDialog instead of freeform typing when a lane has options set.
 */
import { supabase } from "./supabaseClient";
import type { Lane, LaneTitleOption } from "./types";

export async function getLaneTitleOptions(): Promise<LaneTitleOption[]> {
  const { data, error } = await supabase
    .from("lane_title_options")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    console.error("[laneTitleOptionRepository] getLaneTitleOptions error:", error);
    return [];
  }

  return (data || []).map((o) => ({
    id: o.id,
    lane: o.lane as Lane,
    label: o.label,
  }));
}

export async function addLaneTitleOption(input: Omit<LaneTitleOption, "id">): Promise<LaneTitleOption> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("lane_title_options").insert({
    id,
    lane: input.lane,
    label: input.label,
  });

  if (error) throw error;
  return { ...input, id };
}

export async function updateLaneTitleOption(updated: LaneTitleOption): Promise<void> {
  const { error } = await supabase
    .from("lane_title_options")
    .update({ lane: updated.lane, label: updated.label })
    .eq("id", updated.id);

  if (error) throw error;
}

export async function removeLaneTitleOption(id: string): Promise<void> {
  const { error } = await supabase.from("lane_title_options").delete().eq("id", id);
  if (error) throw error;
}
