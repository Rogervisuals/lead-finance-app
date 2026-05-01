import type { SupabaseClient } from "@supabase/supabase-js";
import {
  estimateCostFromTokens,
  getOrCreateUserAiUsageRow,
  applyResetsIfNeeded,
  updateUsageAfterRequest,
  usageMetaFromRow,
  touchAssistantCooldown,
  MIN_REQUEST_INTERVAL_MS,
  type UsageMeta,
  type AiUsageCaps,
} from "./usage";
import { tryDbOnlyAnswer } from "./query-router";

function estimateTokensRough(text: string) {
  // Very rough heuristic: ~4 chars per token in English-ish text.
  const s = String(text ?? "");
  return Math.max(1, Math.ceil(s.length / 4));
}

export type AiCallResult =
  | { ok: true; actions: unknown[]; tokens_used: number; raw?: unknown }
  | { ok: false; error: string; status?: number; details?: string };

export type HandleAIRequestResult =
  | {
      ok: true;
      kind: "db_only";
      answer: string;
      usage: UsageMeta;
    }
  | {
      ok: true;
      kind: "ai";
      actions: unknown[];
      usage: UsageMeta;
    }
  | {
      ok: false;
      status: number;
      error: string;
      usage?: UsageMeta;
    };

function capsFromOpts(limits: { dailyCap: number; monthlyCostCap: number }): AiUsageCaps {
  return { dailyLimit: limits.dailyCap, monthlyBudgetCap: limits.monthlyCostCap };
}

export async function handleAIRequest(
  supabase: SupabaseClient,
  userId: string,
  input: string,
  opts: {
    limits: { dailyCap: number; monthlyCostCap: number };
    /** When true, responses are shorter (abuse / cost protection). */
    abuse?: { flagged: boolean };
    callAi: (params: { max_tokens: number }) => Promise<AiCallResult>;
  }
): Promise<HandleAIRequestResult> {
  const caps = capsFromOpts(opts.limits);
  const meta = (row: Parameters<typeof usageMetaFromRow>[0]) => usageMetaFromRow(row, caps);

  const now = new Date();
  const usage0 = await getOrCreateUserAiUsageRow(supabase, userId);
  const usage = await applyResetsIfNeeded(supabase, usage0, now);

  // 4. RATE LIMIT
  if (usage.last_request_at) {
    const lastMs = new Date(usage.last_request_at).getTime();
    const elapsed = Date.now() - lastMs;
    if (Number.isFinite(lastMs) && elapsed >= 0 && elapsed < MIN_REQUEST_INTERVAL_MS) {
      return {
        ok: false,
        status: 429,
        error: "Please wait a moment before sending another request.",
        usage: meta(usage),
      };
    }
  }

  // 7. ROUTING (DB-only for cheap aggregations)
  const dbOnly = await tryDbOnlyAnswer(supabase, userId, input);
  if (dbOnly.ok) {
    try {
      await touchAssistantCooldown(supabase, userId, now);
    } catch {
      console.warn("[ai] touchAssistantCooldown failed");
    }
    return {
      ok: true,
      kind: "db_only",
      answer: dbOnly.answer,
      usage: meta(usage),
    };
  }

  // 5. MONTHLY COST LIMIT (HARD CAP)
  if (Number(usage.monthly_cost ?? 0) >= opts.limits.monthlyCostCap) {
    return {
      ok: false,
      status: 429,
      error: "AI insights are temporarily limited due to high usage.",
      usage: meta(usage),
    };
  }

  // 5. DAILY LIMIT (VISIBLE LIMIT)
  const dailyRequests = Number(usage.daily_requests ?? 0);
  if (dailyRequests >= opts.limits.dailyCap) {
    return {
      ok: false,
      status: 429,
      error: "You've reached your daily AI limit. Try again tomorrow.",
      usage: meta(usage),
    };
  }

  // 10. RESPONSE DEGRADATION (relative to this plan’s monthly cap)
  const monthlyCost = Number(usage.monthly_cost ?? 0);
  const monthlyCap = opts.limits.monthlyCostCap;
  let maxTokens = 450; // baseline compact responses
  if (monthlyCap > 0) {
    if (monthlyCost > (monthlyCap * 5) / 6) maxTokens = 120;
    else if (monthlyCost > (monthlyCap * 2) / 3) maxTokens = 220;
  }
  if (opts.abuse?.flagged) {
    maxTokens = Math.min(maxTokens, 100);
  }

  // 11. FAILSAFE: don't call AI if the worst-case would exceed budget.
  const estIn = estimateTokensRough(input);
  const worstCaseTokens = estIn + maxTokens;
  const worstCost = estimateCostFromTokens(worstCaseTokens);
  if (monthlyCost + worstCost > opts.limits.monthlyCostCap) {
    return {
      ok: false,
      status: 429,
      error: "AI insights are temporarily limited due to high usage.",
      usage: meta(usage),
    };
  }

  // 8. EXECUTE AI CALL (ONLY IF ALLOWED)
  const aiRes = await opts.callAi({ max_tokens: maxTokens });
  if (!aiRes.ok) {
    return {
      ok: false,
      status: aiRes.status ?? 502,
      error: aiRes.error,
      usage: meta(usage),
    };
  }

  // 9. UPDATE USAGE
  const tokensUsed = Math.max(0, Math.floor(aiRes.tokens_used || 0));
  const cost = estimateCostFromTokens(tokensUsed);
  const updated = await updateUsageAfterRequest(supabase, userId, {
    tokens_used: tokensUsed,
    cost,
    now,
  });

  return {
    ok: true,
    kind: "ai",
    actions: aiRes.actions,
    usage: meta(updated),
  };
}

