import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/subscription/types";

/** Only include keys you want to write; omitted keys are left unchanged on upsert conflict. */
export type StripeBillingPatch = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  cancel_at_period_end?: boolean;
  subscription_current_period_end?: string | null;
};

/**
 * Client success-page path: apply plan immediately after Checkout redirect.
 * Stripe webhooks (`/api/stripe/webhook`) are the source of truth for renewals and cancellations.
 * When `stripeBilling` is passed, customer/subscription ids and period schedule are stored too
 * (otherwise only webhooks would fill them — easy to miss in local dev).
 */
export async function applyPlanAfterCheckout(
  supabase: SupabaseClient,
  userId: string,
  plan: Extract<PlanId, "basic" | "pro">,
  stripeBilling?: StripeBillingPatch | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row: Record<string, string | boolean | null> = {
    user_id: userId,
    plan,
    status: "active",
  };
  if (stripeBilling) {
    for (const [key, val] of Object.entries(stripeBilling)) {
      if (val !== undefined) {
        row[key] = val as string | boolean | null;
      }
    }
  }

  const { error } = await supabase.from("subscriptions").upsert(row, {
    onConflict: "user_id",
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
