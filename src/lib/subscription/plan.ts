/**
 * Subscription rows in `public.subscriptions` — always read from Supabase (no env overrides).
 * When missing, we insert a default Free row so plan-gated features (e.g. invoices) match product limits until Stripe/webhooks update the plan.
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUseInvoiceFeatures, getEffectivePlan } from "@/lib/permissions";
import type { PlanId } from "@/lib/subscription/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

async function readPlanFromSubscriptions(
  supabase: Db,
  userId: string
): Promise<PlanId> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return "free";
  const raw = (data as { plan?: string | null }).plan;
  return getEffectivePlan(raw ?? undefined);
}

/**
 * If the user has no subscription row, insert plan = free, status = active.
 * Returns the effective plan in one round-trip when the row already exists; otherwise
 * insert + read matches the former `ensureSubscriptionForUser` + `getUserPlanWithClient` pair.
 */
export async function ensureSubscriptionAndGetPlan(
  supabase: Db,
  userId: string
): Promise<PlanId> {
  const { data: row, error: selErr } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) {
    return readPlanFromSubscriptions(supabase, userId);
  }

  if (row) {
    const raw = (row as { plan?: string | null }).plan;
    return getEffectivePlan(raw ?? undefined);
  }

  const { error: insErr } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan: "free",
    status: "active",
  });

  if (!insErr) {
    return getEffectivePlan("free");
  }

  return readPlanFromSubscriptions(supabase, userId);
}

/**
 * Returns the current plan from the database, or `free` if missing or unknown.
 * Does not insert a default row (use `ensureSubscriptionAndGetPlan` when the row must exist).
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  const supabase = createSupabaseServerClient();
  return getUserPlanWithClient(supabase, userId);
}

export async function getUserPlanWithClient(
  supabase: Db,
  userId: string
): Promise<PlanId> {
  return readPlanFromSubscriptions(supabase, userId);
}

/**
 * Server actions / pages that require Pro invoice features call this first.
 * Redirects to the dashboard with a hint when plan is Free or Basic.
 */
export async function assertInvoiceFeaturesAllowed(
  supabase: Db,
  userId: string
): Promise<void> {
  const plan = await ensureSubscriptionAndGetPlan(supabase, userId);
  if (!canUseInvoiceFeatures(plan)) {
    redirect("/finance/invoices");
  }
}
