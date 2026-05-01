import type { SupabaseClient } from "@supabase/supabase-js";

export const COST_PER_1K_TOKENS = 0.01;
export { MIN_REQUEST_INTERVAL_MS } from "@/lib/ai/assistant-limits";

/** Caps for a single request; must match the user’s subscription (see `permissions`). */
export type AiUsageCaps = {
  dailyLimit: number;
  monthlyBudgetCap: number;
};

export type UserAiUsageRow = {
  user_id: string;
  daily_requests: number;
  monthly_requests: number;
  daily_tokens: number;
  monthly_tokens: number;
  monthly_cost: number;
  last_request_at: string | null;
  last_reset_daily: string | null;
  last_reset_monthly: string | null;
  flagged: boolean;
  abuse_strike_count: number;
};

function normalizeUserAiUsageRow(data: unknown): UserAiUsageRow {
  const r = data as Record<string, unknown>;
  return {
    ...(data as UserAiUsageRow),
    flagged: Boolean(r.flagged),
    abuse_strike_count: Number(r.abuse_strike_count ?? 0),
  };
}

export type UsageMeta = {
  daily_used: number;
  daily_limit: number;
  remaining_budget: number;
};

export function estimateCostFromTokens(tokensUsed: number) {
  const t = Math.max(0, Math.floor(tokensUsed || 0));
  return (t / 1000) * COST_PER_1K_TOKENS;
}

export function usageMetaFromRow(row: UserAiUsageRow, caps: AiUsageCaps): UsageMeta {
  const used = Number(row.daily_requests ?? 0);
  return {
    daily_used: used,
    daily_limit: caps.dailyLimit,
    remaining_budget: Math.max(0, caps.monthlyBudgetCap - Number(row.monthly_cost ?? 0)),
  };
}

function ymdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Columns present on all deployments (before optional abuse migration). */
const USER_AI_USAGE_SELECT_BASE =
  "user_id,daily_requests,monthly_requests,daily_tokens,monthly_tokens,monthly_cost,last_request_at,last_reset_daily,last_reset_monthly";

/**
 * Reads optional `flagged` / `abuse_strike_count` when migration `20260502_user_ai_usage_abuse_flags` is applied.
 * Returns defaults when columns are missing or the row is absent.
 */
export async function tryFetchAbuseColumns(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ flagged: boolean; abuse_strike_count: number }> {
  const { data, error } = await supabase
    .from("user_ai_usage")
    .select("flagged,abuse_strike_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return { flagged: false, abuse_strike_count: 0 };
  }
  const r = data as { flagged?: unknown; abuse_strike_count?: unknown };
  return {
    flagged: Boolean(r.flagged),
    abuse_strike_count: Number(r.abuse_strike_count ?? 0),
  };
}

export async function getOrCreateUserAiUsageRow(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAiUsageRow> {
  const { data, error } = await supabase
    .from("user_ai_usage")
    .select(USER_AI_USAGE_SELECT_BASE)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error("Could not read AI usage limits.");
  }
  if (data) {
    return normalizeUserAiUsageRow(data);
  }

  const nowIso = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("user_ai_usage")
    .insert({
      user_id: userId,
      daily_requests: 0,
      monthly_requests: 0,
      daily_tokens: 0,
      monthly_tokens: 0,
      monthly_cost: 0,
      last_request_at: null,
      last_reset_daily: nowIso,
      last_reset_monthly: nowIso,
    })
    .select(USER_AI_USAGE_SELECT_BASE)
    .maybeSingle();
  if (insErr || !inserted) {
    throw new Error("Could not initialize AI usage limits.");
  }
  return normalizeUserAiUsageRow(inserted);
}

export function computeResets(row: UserAiUsageRow, now: Date) {
  const today = ymdUTC(now);
  const thisMonth = ymUTC(now);
  const lastDaily = row.last_reset_daily ? ymdUTC(new Date(row.last_reset_daily)) : null;
  const lastMonthly = row.last_reset_monthly ? ymUTC(new Date(row.last_reset_monthly)) : null;

  const resetDaily = !lastDaily || lastDaily !== today;
  const resetMonthly = !lastMonthly || lastMonthly !== thisMonth;

  return { resetDaily, resetMonthly };
}

export async function applyResetsIfNeeded(
  supabase: SupabaseClient,
  row: UserAiUsageRow,
  now: Date
): Promise<UserAiUsageRow> {
  const { resetDaily, resetMonthly } = computeResets(row, now);
  if (!resetDaily && !resetMonthly) return row;

  const patch: Partial<UserAiUsageRow> & { user_id: string } = {
    user_id: row.user_id,
  };
  if (resetDaily) {
    patch.daily_requests = 0;
    patch.daily_tokens = 0;
    patch.last_reset_daily = now.toISOString();
  }
  if (resetMonthly) {
    patch.monthly_requests = 0;
    patch.monthly_tokens = 0;
    patch.monthly_cost = 0;
    patch.last_reset_monthly = now.toISOString();
  }

  const { data, error } = await supabase
    .from("user_ai_usage")
    .update(patch)
    .eq("user_id", row.user_id)
    .select(USER_AI_USAGE_SELECT_BASE)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not reset AI usage limits.");
  }
  return normalizeUserAiUsageRow(data);
}

export async function updateUsageAfterRequest(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    tokens_used: number;
    cost: number;
    now: Date;
  }
): Promise<UserAiUsageRow> {
  const nowIso = opts.now.toISOString();
  // Read-modify-write is OK here because we enforce rate limits; keep it simple.
  const current = await getOrCreateUserAiUsageRow(supabase, userId);
  const row = await applyResetsIfNeeded(supabase, current, opts.now);

  const next = {
    daily_requests: Number(row.daily_requests ?? 0) + 1,
    monthly_requests: Number(row.monthly_requests ?? 0) + 1,
    daily_tokens: Number(row.daily_tokens ?? 0) + Math.max(0, Math.floor(opts.tokens_used || 0)),
    monthly_tokens: Number(row.monthly_tokens ?? 0) + Math.max(0, Math.floor(opts.tokens_used || 0)),
    monthly_cost: Number(row.monthly_cost ?? 0) + Math.max(0, Number(opts.cost || 0)),
    last_request_at: nowIso,
  };

  const { data, error } = await supabase
    .from("user_ai_usage")
    .update(next)
    .eq("user_id", userId)
    .select(USER_AI_USAGE_SELECT_BASE)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Could not update AI usage limits.");
  }
  return normalizeUserAiUsageRow(data);
}

/** Updates only `last_request_at` (e.g. DB-only assistant answers) without consuming a daily slot. */
export async function touchAssistantCooldown(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<void> {
  const { error } = await supabase
    .from("user_ai_usage")
    .update({ last_request_at: now.toISOString() })
    .eq("user_id", userId);
  if (error) {
    throw new Error("Could not update AI cooldown.");
  }
}

