import type { SupabaseClient } from "@supabase/supabase-js";
import { ABUSE_STRIKES_TO_FLAG } from "@/lib/ai/assistant-limits";
import { getOrCreateUserAiUsageRow } from "@/lib/ai/usage";

/**
 * Increments abuse strikes and may set `flagged` when the user repeatedly hits
 * per-minute limits or the daily AI cap. Intended to be fire-and-forget.
 */
export async function incrementAiAbuseStrike(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    await getOrCreateUserAiUsageRow(supabase, userId);
  } catch {
    return;
  }

  const { data, error } = await supabase
    .from("user_ai_usage")
    .select("abuse_strike_count,flagged")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return;

  const prev = Number((data as { abuse_strike_count?: unknown }).abuse_strike_count ?? 0);
  const next = prev + 1;
  const already = Boolean((data as { flagged?: unknown }).flagged);
  const flagged = already || next >= ABUSE_STRIKES_TO_FLAG;

  const { error: upErr } = await supabase
    .from("user_ai_usage")
    .update({ abuse_strike_count: next, flagged })
    .eq("user_id", userId);
  if (upErr) {
    console.error("[ai] abuse_strike update failed", upErr.message);
  }
}
