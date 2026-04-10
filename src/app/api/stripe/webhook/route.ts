export const runtime = "nodejs";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  scheduleFieldsFromStripeSubscription,
  syncSubscriptionScheduleFromStripe,
  updateSubscriptionStripeIds,
  upsertSubscriptionFromStripeWebhook,
} from "@/lib/billing/sync-subscription-webhook";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getStripe, resolvePaidPlanFromStripePriceId } from "@/lib/stripe/server";
import type { PlanId } from "@/lib/subscription/types";

function paidPlanFromSessionOrSubscription(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription | null
): PlanId {
  const mp = session.metadata?.plan;
  if (mp === "basic" || mp === "pro") return mp;

  if (subscription) {
    const sp = subscription.metadata?.plan;
    if (sp === "basic" || sp === "pro") return sp;
    const priceId = subscription.items.data[0]?.price?.id;
    const resolved = resolvePaidPlanFromStripePriceId(priceId);
    if (resolved) return resolved;
  }

  return "pro";
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.warn(
      "[stripe webhook] checkout.session.completed: missing metadata.supabase_user_id"
    );
    return;
  }

  let subscription: Stripe.Subscription | null = null;
  const subRef = session.subscription;
  if (typeof subRef === "string") {
    subscription = await stripe.subscriptions.retrieve(subRef);
  } else if (subRef && typeof subRef === "object" && "id" in subRef) {
    subscription = subRef as Stripe.Subscription;
  }

  const plan = paidPlanFromSessionOrSubscription(session, subscription);

  const customerRaw = session.customer;
  const customerId =
    typeof customerRaw === "string"
      ? customerRaw
      : customerRaw &&
          typeof customerRaw === "object" &&
          !("deleted" in customerRaw && (customerRaw as Stripe.DeletedCustomer).deleted)
        ? (customerRaw as Stripe.Customer).id
        : null;

  const subscriptionId =
    subscription?.id ?? (typeof subRef === "string" ? subRef : null);

  const result = await upsertSubscriptionFromStripeWebhook(supabase, userId, plan, "active");
  if (!result.ok) {
    console.error("[stripe webhook] checkout.session.completed upsert:", result.message);
  }

  if (customerId || subscriptionId) {
    const idRes = await updateSubscriptionStripeIds(supabase, userId, {
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: subscriptionId ?? undefined,
    });
    if (!idRes.ok) {
      console.error("[stripe webhook] checkout.session.completed stripe ids:", idRes.message);
    }
  }

  if (subscription) {
    const sch = await syncSubscriptionScheduleFromStripe(
      supabase,
      userId,
      scheduleFieldsFromStripeSubscription(subscription)
    );
    if (!sch.ok) {
      console.error("[stripe webhook] checkout.session.completed schedule:", sch.message);
    }
  }
}

async function handleInvoicePaymentSucceeded(
  stripe: Stripe,
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  invoice: Stripe.Invoice
) {
  const invoiceWithSub = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    subscription_details?: { metadata?: Stripe.Metadata | null } | null;
  };
  
  const subscriptionId =
    typeof invoiceWithSub.subscription === "string"
      ? invoiceWithSub.subscription
      : invoiceWithSub.subscription?.id;
  
  if (!subscriptionId) return;
  
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  
  let userId = sub.metadata?.supabase_user_id;
  
  const subDetails = invoiceWithSub.subscription_details;
  
  if (!userId && subDetails?.metadata?.supabase_user_id) {
    userId = subDetails.metadata.supabase_user_id;
  }
  
  if (!userId && invoice.customer) {
    const custId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer.id;
  
    const customer = await stripe.customers.retrieve(custId);
  
    if (!customer.deleted && "metadata" in customer) {
      userId = customer.metadata?.supabase_user_id ?? undefined;
    }
  }

  if (!userId) {
    console.warn(
      "[stripe webhook] invoice.payment_succeeded: could not resolve supabase_user_id"
    );
    return;
  }

  let plan: PlanId = "pro";
  const p = sub.metadata?.plan;
  if (p === "basic" || p === "pro") {
    plan = p;
  } else {
    const priceId = sub.items.data[0]?.price?.id;
    const resolved = resolvePaidPlanFromStripePriceId(priceId);
    if (resolved) plan = resolved;
  }

  const result = await upsertSubscriptionFromStripeWebhook(supabase, userId, plan, "active");
  if (!result.ok) {
    console.error("[stripe webhook] invoice.payment_succeeded upsert:", result.message);
  }

  const custId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  if (custId || sub.id) {
    const idRes = await updateSubscriptionStripeIds(supabase, userId, {
      stripe_customer_id: custId ?? undefined,
      stripe_subscription_id: sub.id,
    });
    if (!idRes.ok) {
      console.error("[stripe webhook] invoice.payment_succeeded stripe ids:", idRes.message);
    }
  }

  const sch = await syncSubscriptionScheduleFromStripe(
    supabase,
    userId,
    scheduleFieldsFromStripeSubscription(sub)
  );
  if (!sch.ok) {
    console.error("[stripe webhook] invoice.payment_succeeded schedule:", sch.message);
  }
}

async function handleCustomerSubscriptionUpdated(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    console.warn(
      "[stripe webhook] customer.subscription.updated: missing metadata.supabase_user_id"
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const idRes = await updateSubscriptionStripeIds(supabase, userId, {
    stripe_customer_id: customerId ?? undefined,
    stripe_subscription_id: subscription.id,
  });
  if (!idRes.ok) {
    console.error("[stripe webhook] customer.subscription.updated stripe ids:", idRes.message);
  }

  const sch = await syncSubscriptionScheduleFromStripe(
    supabase,
    userId,
    scheduleFieldsFromStripeSubscription(subscription)
  );
  if (!sch.ok) {
    console.error("[stripe webhook] customer.subscription.updated schedule:", sch.message);
  }

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return;
  }

  let plan: PlanId = "pro";
  const metaPlan = subscription.metadata?.plan;
  if (metaPlan === "basic" || metaPlan === "pro") {
    plan = metaPlan;
  } else {
    const price = subscription.items.data[0]?.price;
    const priceId = typeof price === "string" ? price : price?.id;
    const resolved = resolvePaidPlanFromStripePriceId(priceId ?? null);
    if (resolved) plan = resolved;
  }

  const up = await upsertSubscriptionFromStripeWebhook(supabase, userId, plan, "active");
  if (!up.ok) {
    console.error("[stripe webhook] customer.subscription.updated upsert:", up.message);
  }
}

async function handleCustomerSubscriptionDeleted(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    console.warn(
      "[stripe webhook] customer.subscription.deleted: missing metadata.supabase_user_id"
    );
    return;
  }

  const result = await upsertSubscriptionFromStripeWebhook(
    supabase,
    userId,
    "free",
    "cancelled"
  );
  if (!result.ok) {
    console.error("[stripe webhook] customer.subscription.deleted upsert:", result.message);
  }

  const sch = await syncSubscriptionScheduleFromStripe(supabase, userId, {
    cancel_at_period_end: false,
    subscription_current_period_end: null,
  });
  if (!sch.ok) {
    console.error("[stripe webhook] customer.subscription.deleted schedule:", sch.message);
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("Webhook error:", new Error("Missing STRIPE_WEBHOOK_SECRET"));
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook error:", err);
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const supabase = createSupabaseServiceRoleClient();

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          stripe,
          supabase,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          stripe,
          supabase,
          event.data.object as Stripe.Invoice
        );
        break;
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(
          supabase,
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(
          supabase,
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
