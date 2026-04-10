import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/subscription/types";

/**
 * Billing fields returned by the Stripe HTTP API that are not always present on
 * the published `Stripe.Subscription` / `Stripe.SubscriptionItem` interfaces.
 */
type SubscriptionWithBillingFields = Stripe.Subscription & {
  current_period_end?: number;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
};

type SubscriptionItemWithBillingPeriod = Stripe.SubscriptionItem & {
  current_period_end?: number;
};

/** True when renewal is off but access continues until the end of the paid period. */
function isCancelAtPeriodEndScheduled(sub: Stripe.Subscription): boolean {
  const s = sub as SubscriptionWithBillingFields;

  // standaard Stripe flag
  if (sub.cancel_at_period_end === true) {
    return true;
  }

  // future cancel date
  if (
    typeof s.cancel_at === "number" &&
    Number.isFinite(s.cancel_at) &&
    s.cancel_at > Math.floor(Date.now() / 1000)
  ) {
    return true;
  }

  // 🔥 FIX: already cancelled but still running until period end
  if (sub.canceled_at) {
    return true;
  }

  return false;
}

function periodEndUnixFromSubscription(sub: Stripe.Subscription): number | null {
  const s = sub as SubscriptionWithBillingFields;
  if (typeof s.current_period_end === "number" && Number.isFinite(s.current_period_end)) {
    return s.current_period_end;
  }
  const item = sub.items?.data?.[0] as SubscriptionItemWithBillingPeriod | undefined;
  if (
    item &&
    typeof item.current_period_end === "number" &&
    Number.isFinite(item.current_period_end)
  ) {
    return item.current_period_end;
  }
  if (
    isCancelAtPeriodEndScheduled(sub) &&
    typeof s.cancel_at === "number" &&
    Number.isFinite(s.cancel_at)
  ) {
    return s.cancel_at;
  }
  return null;
}

function readScheduleFromStripeSubscriptionObject(sub: Stripe.Subscription): {
  cancel_at_period_end: boolean;
  subscription_current_period_end: string | null;
} {
  const endUnix = periodEndUnixFromSubscription(sub);
  return {
    cancel_at_period_end: isCancelAtPeriodEndScheduled(sub),
    subscription_current_period_end:
      endUnix !== null ? new Date(endUnix * 1000).toISOString() : null,
  };
}

export function scheduleFieldsFromStripeSubscription(sub: Stripe.Subscription): {
  cancel_at_period_end: boolean;
  subscription_current_period_end: string | null;
} {
  return readScheduleFromStripeSubscriptionObject(sub);
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
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      cancel_at_period_end: schedule.cancel_at_period_end,
      subscription_current_period_end: schedule.subscription_current_period_end,
    })
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return {
      ok: false,
      message:
        "No subscriptions row for this user — schedule fields were not written. Ensure plan upsert runs before schedule sync.",
    };
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
