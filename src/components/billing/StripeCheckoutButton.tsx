"use client";

import { useState } from "react";
import { startStripeCheckout } from "@/lib/stripe/handle-upgrade";
import type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";

type Props = {
  plan: PaidCheckoutPlan;
  className?: string;
  children?: React.ReactNode;
};

const defaultClass: Record<PaidCheckoutPlan, string> = {
  basic:
    "rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-60",
  pro: "rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-500 disabled:opacity-60",
};

const defaultLabel: Record<PaidCheckoutPlan, string> = {
  basic: "Upgrade to Basic",
  pro: "Upgrade to Pro",
};

/**
 * Starts Stripe Checkout (subscription) for the given plan; price ids come from env.
 */
export function StripeCheckoutButton({ plan, className, children }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      await startStripeCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={className ?? defaultClass[plan]}
      >
        {pending ? "Redirecting…" : (children ?? defaultLabel[plan])}
      </button>
      {error ? (
        <p className="max-w-md whitespace-pre-line text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UpgradeToBasicButton(props: Omit<Props, "plan">) {
  return <StripeCheckoutButton plan="basic" {...props} />;
}

export function UpgradeToProButton(props: Omit<Props, "plan">) {
  return <StripeCheckoutButton plan="pro" {...props} />;
}
