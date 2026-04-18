"use client";

import {
  UpgradeToBasicButton,
  UpgradeToProButton,
} from "@/components/billing/StripeCheckoutButton";
import { getStaticLimitsForPlan } from "@/lib/billing/static-plan-limits";
import type { PlanId } from "@/lib/subscription/types";
import type { SubscriptionLimitsPayload } from "@/lib/subscription/limits-data";

type BillingCopy = {
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
};

export type ComparePlansCopy = {
  heading: string;
  intro: string;
  previewBadge: string;
  yourPlanBadge: string;
  recommendedBadge: string;
  usageDash: string;
};

function formatCap(n: number | null, unlimitedLabel: string): string {
  if (n == null) return unlimitedLabel;
  if (!Number.isFinite(n) || n === Number.POSITIVE_INFINITY) return unlimitedLabel;
  return String(n);
}

function planTitle(plan: PlanId): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function FeatureCell({
  enabled,
  previewColumn,
  includedLabel,
  notIncludedLabel,
}: {
  enabled: boolean;
  previewColumn: boolean;
  includedLabel: string;
  notIncludedLabel: string;
}) {
  if (!enabled) {
    if (previewColumn) {
      return (
        <span className="flex items-center justify-end gap-1.5" title={notIncludedLabel}>
          <span className="text-base leading-none" aria-hidden>
            🔒
          </span>
          <span className="sr-only">{notIncludedLabel}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center justify-end gap-2">
        <span className="text-lg leading-none text-zinc-600" aria-hidden>
          ✗
        </span>
        <span className="sr-only">{notIncludedLabel}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="text-lg leading-none text-emerald-400" aria-hidden>
        ✓
      </span>
      <span className="sr-only">{includedLabel}</span>
    </span>
  );
}

function PlanCompareCard({
  columnPlan,
  currentPlan,
  limits,
  copy,
  compareCopy,
}: {
  columnPlan: PlanId;
  currentPlan: PlanId;
  limits: SubscriptionLimitsPayload;
  copy: BillingCopy;
  compareCopy: ComparePlansCopy;
}) {
  const staticLimits = getStaticLimitsForPlan(columnPlan);
  const isCurrentColumn = columnPlan === currentPlan;
  const isPreviewColumn = !isCurrentColumn;
  const isProColumn = columnPlan === "pro";

  const projectsLeft = isCurrentColumn ? String(limits.projectCount) : compareCopy.usageDash;
  const projectsRight = isCurrentColumn
    ? formatCap(limits.maxProjects, copy.unlimited)
    : formatCap(staticLimits.maxProjects, copy.unlimited);

  const clientsLeft = isCurrentColumn ? String(limits.clientCount) : compareCopy.usageDash;
  const clientsRight = isCurrentColumn
    ? formatCap(limits.maxClients, copy.unlimited)
    : formatCap(staticLimits.maxClients, copy.unlimited);

  const effectiveAiCap = isCurrentColumn ? limits.aiDailyCap : staticLimits.aiDailyCap;

  const aiBlock = (() => {
    const used = isCurrentColumn ? limits.aiUsedToday : null;
    if (effectiveAiCap === 0) {
      return (
        <FeatureCell
          enabled={false}
          previewColumn={isPreviewColumn}
          includedLabel={copy.billingFeatureIncluded}
          notIncludedLabel={copy.billingFeatureNotIncluded}
        />
      );
    }
    const capLabel = Number.isFinite(effectiveAiCap) ? String(effectiveAiCap) : copy.unlimited;
    const left =
      used != null && isCurrentColumn ? String(used) : isPreviewColumn ? compareCopy.usageDash : "0";
    return (
      <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-zinc-200">
        <span>
          {left} / {capLabel}
        </span>
        <span className="sr-only">{copy.billingFeatureIncluded}</span>
      </span>
    );
  })();

  const cardClass = [
    "relative flex h-full flex-col rounded-xl border px-3 py-4 text-sm sm:px-4",
    isProColumn
      ? "z-[1] border-violet-500/45 bg-gradient-to-b from-violet-950/35 to-zinc-950/40 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
      : "border-zinc-800/80 bg-zinc-950/25",
    isPreviewColumn ? "opacity-[0.82]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      {isProColumn ? (
        <div className="absolute -top-2.5 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full border border-violet-500/50 bg-violet-950/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
          {compareCopy.recommendedBadge}
        </div>
      ) : null}

      <div className={`mb-3 flex min-h-[3.25rem] flex-col gap-1 ${isProColumn ? "pt-2" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-100">{planTitle(columnPlan)}</h3>
          {isPreviewColumn ? (
            <span className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {compareCopy.previewBadge}
            </span>
          ) : (
            <span className="shrink-0 rounded-md border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300/95">
              {compareCopy.yourPlanBadge}
            </span>
          )}
        </div>
      </div>

      <dl className="grid gap-2">
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.projects}</dt>
          <dd className="tabular-nums text-right text-zinc-200">
            {projectsLeft} / {projectsRight}
          </dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.clients}</dt>
          <dd className="tabular-nums text-right text-zinc-200">
            {clientsLeft} / {clientsRight}
          </dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.billingAiRequests}</dt>
          <dd className="text-right">{aiBlock}</dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.billingFeatureBusiness}</dt>
          <dd>
            <FeatureCell
              enabled={staticLimits.businessFeatures}
              previewColumn={isPreviewColumn}
              includedLabel={copy.billingFeatureIncluded}
              notIncludedLabel={copy.billingFeatureNotIncluded}
            />
          </dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.billingFeatureRateInsights}</dt>
          <dd>
            <FeatureCell
              enabled={staticLimits.rateInsights}
              previewColumn={isPreviewColumn}
              includedLabel={copy.billingFeatureIncluded}
              notIncludedLabel={copy.billingFeatureNotIncluded}
            />
          </dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.billingFeatureInvoices}</dt>
          <dd>
            <FeatureCell
              enabled={staticLimits.invoiceFeatures}
              previewColumn={isPreviewColumn}
              includedLabel={copy.billingFeatureIncluded}
              notIncludedLabel={copy.billingFeatureNotIncluded}
            />
          </dd>
        </div>
        <div className="flex justify-between gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-2.5 py-2">
          <dt className="text-zinc-500">{copy.billingFeatureTimer}</dt>
          <dd>
            <FeatureCell
              enabled={staticLimits.activeTimer}
              previewColumn={isPreviewColumn}
              includedLabel={copy.billingFeatureIncluded}
              notIncludedLabel={copy.billingFeatureNotIncluded}
            />
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-1 flex-col justify-end gap-2 border-t border-zinc-800/60 pt-4">
        {currentPlan === "free" && columnPlan === "basic" ? <UpgradeToBasicButton /> : null}
        {currentPlan === "free" && columnPlan === "pro" ? <UpgradeToProButton /> : null}
        {currentPlan === "basic" && columnPlan === "pro" ? <UpgradeToProButton /> : null}
      </div>
    </div>
  );
}

export function ComparePlansSection({
  currentPlan,
  limits,
  copy,
  compareCopy,
}: {
  currentPlan: PlanId;
  limits: SubscriptionLimitsPayload;
  copy: BillingCopy;
  compareCopy: ComparePlansCopy;
}) {
  const order: PlanId[] = ["free", "basic", "pro"];

  return (
    <section className="border-b border-zinc-800/80 pb-10" aria-labelledby="compare-plans-heading">
      <h2
        id="compare-plans-heading"
        className="text-lg font-semibold tracking-tight text-zinc-100"
      >
        {compareCopy.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{compareCopy.intro}</p>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        {order.map((p) => (
          <PlanCompareCard
            key={p}
            columnPlan={p}
            currentPlan={currentPlan}
            limits={limits}
            copy={copy}
            compareCopy={compareCopy}
          />
        ))}
      </div>
    </section>
  );
}
