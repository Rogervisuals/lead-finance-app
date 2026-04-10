import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/subscription/types";

export function scheduleFieldsFromStripeSubscription(sub: Stripe.Subscription): {
  cancel_at_period_end: boolean;
  subscription_current_period_end: string | null;
} {
  return {
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    subscription_current_period_end:
      typeof sub.current_period_end === "number"
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
  };
}

/** Keeps DB in sync with Stripe cancel-at-period-end and billing period end (service role). */
export async function syncSubscriptionScheduleFromStripe(
  supabase: SupabaseClient,
  userId: string,
  schedule: {
    cancel_at_period_end: boolean;
    subscription_current_period_end: string | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      cancel_at_period_end: schedule.cancel_at_period_end,
      subscription_current_period_end: schedule.subscription_current_period_end,
    })
    .eq("user_id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Single upsert path for Stripe webhook handlers (service-role client bypasses RLS).
 */
export async function upsertSubscriptionFromStripeWebhook(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId,
  status: "active" | "cancelled"
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Does not change plan/status — only stores Stripe ids when present. */
export async function updateSubscriptionStripeIds(
  supabase: SupabaseClient,
  userId: string,
  ids: { stripe_customer_id?: string | null; stripe_subscription_id?: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch: Record<string, string | null> = {};
  if (ids.stripe_customer_id !== undefined && ids.stripe_customer_id !== null) {
    patch.stripe_customer_id = ids.stripe_customer_id;
  }
  if (ids.stripe_subscription_id !== undefined && ids.stripe_subscription_id !== null) {
    patch.stripe_subscription_id = ids.stripe_subscription_id;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
