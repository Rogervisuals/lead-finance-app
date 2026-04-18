export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/stripe/request-origin";
import { getStripe } from "@/lib/stripe/server";

function stripeSearchEmail(email: string): string {
  const escaped = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `email:'${escaped}'`;
}

/**
 * Opens Stripe Customer Portal so the subscriber can cancel at period end, update payment method, etc.
 * Enable the Customer Portal in Stripe Dashboard → Settings → Billing → Customer portal.
 */
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const origin =
      getRequestOrigin(request) ??
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      null;
    if (!origin) {
      return NextResponse.json(
        { error: "Could not determine return URL. Set NEXT_PUBLIC_SITE_URL." },
        { status: 400 }
      );
    }

    const { data: row } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = (row as { stripe_customer_id?: string | null } | null)
      ?.stripe_customer_id;

    const stripe = getStripe();

    if (!customerId && user.email) {
      const search = await stripe.customers.search({
        query: stripeSearchEmail(user.email),
        limit: 1,
      });
      customerId = search.data[0]?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer found. Complete a subscription checkout first, or contact support.",
        },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings#settings-billing`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a portal URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Portal session failed.";
    console.error("[create-portal-session]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
