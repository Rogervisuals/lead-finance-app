"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { completeSubscriptionUpgradeAfterCheckoutAction } from "./actions";

function planLabel(plan: "basic" | "pro"): string {
  return plan === "basic" ? "Basic" : "Pro";
}

export function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [phase, setPhase] = useState<"loading" | "ok" | "err">("loading");
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<"basic" | "pro" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await completeSubscriptionUpgradeAfterCheckoutAction(sessionId);
      if (cancelled) return;
      if (result.ok) {
        setPlan(result.plan);
        setPhase("ok");
      } else {
        setPhase("err");
        setErrMessage(result.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {phase === "loading" ? (
        <>
          <h1 className="text-xl font-semibold text-zinc-100">Finishing your upgrade…</h1>
          <p className="mt-3 text-sm text-zinc-400">Applying your subscription to your account.</p>
        </>
      ) : null}

      {phase === "ok" && plan ? (
        <>
          <h1 className="text-xl font-semibold text-zinc-100">
            Payment successful, your account has been upgraded
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Your plan is set to {planLabel(plan)}. You can continue using Lead Finance with full access.
          </p>
        </>
      ) : null}

      {phase === "err" ? (
        <>
          <h1 className="text-xl font-semibold text-rose-200">Could not update your plan</h1>
          <p className="mt-3 text-sm text-zinc-400">{errMessage}</p>
          <p className="mt-2 text-xs text-zinc-500">
            If payment succeeded, ensure the Supabase migration{" "}
            <code className="rounded bg-zinc-900 px-1">subscriptions_update_own</code> is applied
            (so your user can update their subscription row). Then reload this page while signed in.
          </p>
        </>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-8 inline-block rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-900"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
