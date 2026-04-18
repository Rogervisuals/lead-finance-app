"use client";

import { useState } from "react";
import {
  UpgradeToBasicButton,
  UpgradeToProButton,
} from "@/components/billing/StripeCheckoutButton";
import type { PlanId } from "@/lib/subscription/types";
import type { SubscriptionLimitsPayload } from "@/lib/subscription/limits-data";

type BillingCopy = {
  currentPlan: string;
  limitsHeading: string;
  projects: string;
  clients: string;
  unlimited: string;
  billingAiRequests: string;
  billingFeatureBusiness: string;
  billingFeatureRateInsights: string;
  billingFeatureInvoices: string;
  billingFeatureTimer: string;
  billingFeatureIncluded: string;
  billingFeatureNotIncluded: string;
  billingFeatureInvoicesProBadge: string;
  upgradeHeading: string;
  manageHeading: string;
  manageBody: string;
  openPortal: string;
  portalOpening: string;
  portalFailed: string;
  cancelledLabel: string;
  cancelledBody: string;
};

function formatCap(n: number | null, unlimitedLabel: string): string {
  if (n == null) return unlimitedLabel;
  if (!Number.isFinite(n) || n === Number.POSITIVE_INFINITY) return unlimitedLabel;
  return String(n);
}

function planLabel(plan: PlanId): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function FeatureMark({
  enabled,
  includedLabel,
  notIncludedLabel,
}: {
  enabled: boolean;
  includedLabel: string;
  notIncludedLabel: string;
}) {
  return (
    <span className="flex items-center justify-end gap-2">
      <span
        className={`text-lg leading-none ${enabled ? "text-emerald-400" : "text-zinc-600"}`}
        aria-hidden
      >
        {enabled ? "✓" : "✗"}
      </span>
      <span className="sr-only">{enabled ? includedLabel : notIncludedLabel}</span>
    </span>
  );
}

const limitRowClass =
  "flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2 sm:col-span-2";

export function BillingSubscriptionClient({
  plan,
  limits,
  hasStripeCustomerId,
  showCancelledRenewal,
  copy,
}: {
  plan: PlanId;
  limits: SubscriptionLimitsPayload;
  hasStripeCustomerId: boolean;
  showCancelledRenewal: boolean;
  copy: BillingCopy;
}) {
  const [portalPending, setPortalPending] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function openPortal() {
    setPortalError(null);
    setPortalPending(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? copy.portalFailed);
      }
      if (!data.url) {
        throw new Error(copy.portalFailed);
      }
      window.location.href = data.url;
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : copy.portalFailed);
      setPortalPending(false);
    }
  }

  /** Portal only works with a Stripe customer; hide for free tier or paid rows missing linkage. */
  const showManageSection =
    (plan === "basic" || plan === "pro") && hasStripeCustomerId;

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-medium text-zinc-400">{copy.currentPlan}</h2>
        <p className="mt-1 text-lg font-semibold text-zinc-100">{planLabel(plan)}</p>
        {showCancelledRenewal ? (
          <div
            className="mt-4 rounded-md border border-red-500/70 bg-red-950/45 px-3 py-3 shadow-[0_0_0_1px_rgba(239,68,68,0.12)]"
            role="status"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-400">
              {copy.cancelledLabel}
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-red-100">
              {copy.cancelledBody}
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-100">{copy.limitsHeading}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.projects}</dt>
            <dd className="tabular-nums text-zinc-200">
              {limits.projectCount} /{" "}
              {formatCap(limits.maxProjects, copy.unlimited)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.clients}</dt>
            <dd className="tabular-nums text-zinc-200">
              {limits.clientCount} / {formatCap(limits.maxClients, copy.unlimited)}
            </dd>
          </div>

          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.billingAiRequests}</dt>
            <dd className="text-right">
              {limits.aiDailyCap === 0 ? (
                <FeatureMark
                  enabled={false}
                  includedLabel={copy.billingFeatureIncluded}
                  notIncludedLabel={copy.billingFeatureNotIncluded}
                />
              ) : (
                <span className="inline-flex items-center justify-end gap-2">
                  <span className="tabular-nums text-zinc-200">
                    {limits.aiUsedToday} /{" "}
                    {Number.isFinite(limits.aiDailyCap)
                      ? limits.aiDailyCap
                      : copy.unlimited}
                  </span>
                  <span className="sr-only">{copy.billingFeatureIncluded}</span>
                </span>
              )}
            </dd>
          </div>

          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.billingFeatureBusiness}</dt>
            <dd>
              <FeatureMark
                enabled={limits.businessFeatures}
                includedLabel={copy.billingFeatureIncluded}
                notIncludedLabel={copy.billingFeatureNotIncluded}
              />
            </dd>
          </div>

          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.billingFeatureRateInsights}</dt>
            <dd>
              <FeatureMark
                enabled={limits.rateInsights}
                includedLabel={copy.billingFeatureIncluded}
                notIncludedLabel={copy.billingFeatureNotIncluded}
              />
            </dd>
          </div>

          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.billingFeatureInvoices}</dt>
            <dd className="flex flex-col items-end gap-0.5">

              <FeatureMark
                enabled={limits.invoiceFeatures}
                includedLabel={copy.billingFeatureIncluded}
                notIncludedLabel={copy.billingFeatureNotIncluded}
              />
            </dd>
          </div>

          <div className="flex justify-between gap-4 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2">
            <dt className="text-zinc-400">{copy.billingFeatureTimer}</dt>
            <dd>
              <FeatureMark
                enabled={limits.activeTimer}
                includedLabel={copy.billingFeatureIncluded}
                notIncludedLabel={copy.billingFeatureNotIncluded}
              />
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-100">{copy.upgradeHeading}</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {plan === "free" ? (
            <>
              <UpgradeToBasicButton />
              <UpgradeToProButton />
            </>
          ) : plan === "basic" ? (
            <UpgradeToProButton />
          ) : (
            <p className="text-sm text-zinc-500">You are on the highest plan.</p>
          )}
        </div>
      </section>

      {showManageSection ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/25 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-100">{copy.manageHeading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{copy.manageBody}</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalPending}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {portalPending ? copy.portalOpening : copy.openPortal}
            </button>
            {portalError ? (
              <p className="mt-2 text-xs text-rose-400" role="alert">
                {portalError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
