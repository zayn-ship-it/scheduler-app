/**
 * settingsRepository.ts
 * ---------------------------------------------------------------------------
 * Uses Supabase as the backend for global, app-wide (non-project-scoped)
 * settings, stored as key/value rows in `app_settings`.
 */
import { supabase } from "./supabaseClient";

const TERMS_AND_CONDITIONS_KEY = "terms_and_conditions";

export const DEFAULT_TERMS_AND_CONDITIONS = `This schedule is valid only so long as the 50% deposit is paid by the indicated date, any delays will result in the schedule shifting out, please note that the schedule might not shift out by the exact amount of days delayed as other project schedules need to be considered and delays might have a significant impact on timelines. Kindly take note of the scheduled dates for Client/Agency Reviews and Approvals along with dates and times on which feedback is required. It is important to adhere to the target review and approval dates in order to avoid potential shifts in the overall timeline.`;

export async function getGlobalTermsAndConditions(): Promise<string> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", TERMS_AND_CONDITIONS_KEY)
    .single();

  if (error || !data?.value) {
    return DEFAULT_TERMS_AND_CONDITIONS;
  }

  return data.value;
}

export async function updateGlobalTermsAndConditions(text: string): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: TERMS_AND_CONDITIONS_KEY, value: text });

  if (error) throw error;
}
