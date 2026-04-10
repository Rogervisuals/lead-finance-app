"use server";

import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import {
  applyPlanAfterCheckout,
  type StripeBillingPatch,
} from "@/lib/billing/apply-plan-after-checkout";
import { scheduleFieldsFromStripeSubscription } from "@/lib/billing/sync-subscription-webhook";
import {
  getStripe,
  resolvePaidPlanFromStripePriceId,
} from "@/lib/stripe/server";
import type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";

function priceIdFromLineItem(line: Stripe.LineItem | undefined): string | null {
  const p = line?.price;
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && "id" in p && typeof (p as Stripe.Price).id === "string") {
    return (p as Stripe.Price).id;
  }
  return null;
}

/**
 * After Stripe redirects to `/success?session_id=…`, retrieve the session and
 * set the user’s plan from metadata (or matching Price id).
 */
export async function completeSubscriptionUpgradeAfterCheckoutAction(
  sessionId: string | null
): Promise<
  | { ok: true; plan: PaidCheckoutPlan }
  | { ok: false; message: string }
> {
  const trimmed = sessionId?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      message:
        "Missing checkout session. Use the success link from Stripe Checkout, or start checkout again from the dashboard.",
    };
  }

  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return {
      ok: false,
      message:
        "You must be signed in to apply your upgrade. Sign in, then open this page again (or use the link from your browser where you started checkout).",
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(trimmed, {
    expand: ["line_items", "subscription"],
  });

  if (session.metadata?.supabase_user_id !== user.id) {
    return {
      ok: false,
      message: "This checkout session does not belong to your account.",
    };
  }

  if (session.mode !== "subscription") {
    return { ok: false, message: "This session is not a subscription checkout." };
  }

  if (session.status !== "complete") {
    return {
      ok: false,
      message: "Checkout is not complete yet. Try again in a moment.",
    };
  }

  const meta = session.metadata?.plan;
  let plan: PaidCheckoutPlan | null =
    meta === "basic" || meta === "pro" ? meta : null;

  if (!plan) {
    const priceId = priceIdFromLineItem(session.line_items?.data?.[0]);
    plan = resolvePaidPlanFromStripePriceId(priceId);
  }

  if (!plan) {
    return {
      ok: false,
      message: "Could not determine which plan was purchased. Contact support if payment succeeded.",
    };
  }

  const customerRaw = session.customer;
  const customerId =
    typeof customerRaw === "string"
      ? customerRaw
      : customerRaw &&
          typeof customerRaw === "object" &&
          !(
            "deleted" in customerRaw &&
            (customerRaw as Stripe.DeletedCustomer).deleted
          )
        ? (customerRaw as Stripe.Customer).id
        : null;

  const subRef = session.subscription;
  let stripeBilling: StripeBillingPatch | undefined;
  if (subRef) {
    const sub =
      typeof subRef === "string"
        ? await stripe.subscriptions.retrieve(subRef)
        : (subRef as Stripe.Subscription);
    const sch = scheduleFieldsFromStripeSubscription(sub);
    stripeBilling = {
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      stripe_subscription_id: sub.id,
      cancel_at_period_end: sch.cancel_at_period_end,
      subscription_current_period_end: sch.subscription_current_period_end,
    };
  } else if (customerId) {
    stripeBilling = { stripe_customer_id: customerId };
  }

  const result = await applyPlanAfterCheckout(supabase, user.id, plan, stripeBilling);
  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    return { ok: true, plan };
  }
  return result;
}
