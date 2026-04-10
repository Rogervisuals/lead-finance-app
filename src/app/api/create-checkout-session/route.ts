export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/stripe/request-origin";
import { getStripe, getStripePriceIdForPlan } from "@/lib/stripe/server";
import type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";

/**
 * Starts a Stripe Checkout session (subscription mode, test keys).
 * Body: `{ "plan": "basic" | "pro" }` (default `"pro"`).
 */
export async function POST(request: Request) {
  try {
    let bodyPlan: unknown;
    try {
      const body = (await request.json()) as { plan?: unknown };
      bodyPlan = body?.plan;
    } catch {
      bodyPlan = undefined;
    }
    const plan: PaidCheckoutPlan =
      bodyPlan === "basic" || bodyPlan === "pro" ? bodyPlan : "pro";

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const origin = getRequestOrigin(request);
    if (!origin) {
      return NextResponse.json(
        { error: "Could not determine request origin. Set NEXT_PUBLIC_SITE_URL for server-side calls." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const priceId = getStripePriceIdForPlan(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      customer_email: user.email ?? undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session did not return a URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    console.error("[create-checkout-session]", e);

    const isInvalidKey =
      typeof message === "string" &&
      (message.includes("Invalid API Key") || message.includes("api_key_invalid"));

    return NextResponse.json(
      {
        error: message,
        ...(isInvalidKey
          ? {
              hint:
                "If you just rotated the key: fully stop and restart `npm run dev`. " +
                "On Windows, a STRIPE_SECRET_KEY set in User/System environment variables overrides `.env.local` — check with PowerShell: `[Environment]::GetEnvironmentVariable(\"STRIPE_SECRET_KEY\",\"User\")` and remove the old value if present.",
            }
          : {}),
      },
      { status: 500 }
    );
  }
}
