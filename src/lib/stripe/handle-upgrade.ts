import type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";

/**
 * Client-only: starts Stripe Checkout for Basic or Pro.
 */
export async function startStripeCheckout(plan: PaidCheckoutPlan): Promise<void> {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    hint?: string;
  };

  if (!res.ok) {
    const base = data.error ?? "Could not start checkout.";
    throw new Error(data.hint ? `${base}\n\n${data.hint}` : base);
  }

  if (!data.url) {
    throw new Error("No checkout URL returned.");
  }

  window.location.href = data.url;
}

/** @deprecated Use `startStripeCheckout('pro')`. */
export async function handleUpgrade(): Promise<void> {
  return startStripeCheckout("pro");
}
