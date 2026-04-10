/**
 * Plan-based feature limits. Single source of truth for gating; Stripe webhooks will
 * update `subscriptions.plan` in the DB — no app-level overrides.
 */

import type { PlanId } from "@/lib/subscription/types";

export type PlanFeature = keyof (typeof permissions)["free"];

export const permissions = {
  free: {
    maxProjects: 1,
    /** Max clients on the free plan; Basic+ unlimited. */
    maxClients: 1,
    aiRequests: 0,
    businessFeatures: false,
    /** Best/worst client, avg hourly rate on dashboard; hourly rates on client page. */
    rateInsights: false,
    invoiceFeatures: false,
    /** Header time tracker (start/stop); Free shows upgrade prompt on click. */
    activeTimer: false,
  },
  basic: {
    maxProjects: 10,
    maxClients: Number.POSITIVE_INFINITY,
    aiRequests: 10,
    businessFeatures: true,
    rateInsights: true,
    invoiceFeatures: false,
    activeTimer: true,
  },
  pro: {
    maxProjects: Number.POSITIVE_INFINITY,
    maxClients: Number.POSITIVE_INFINITY,
    aiRequests: Number.POSITIVE_INFINITY,
    businessFeatures: true,
    rateInsights: true,
    /** Create/manage invoices, PDFs, finance invoices hub. */
    invoiceFeatures: true,
    activeTimer: true,
  },
} as const;

/** Returns the raw limit for a feature (number or boolean). Unknown plans fall back to `free`. */
export function hasAccess(plan: string, feature: PlanFeature): boolean | number {
  const p = getEffectivePlan(plan);
  return permissions[p][feature];
}

/** Normalize DB string to a known plan id; invalid/missing → free. */
export function getEffectivePlan(userPlan: string | null | undefined): PlanId {
  const t = String(userPlan ?? "")
    .trim()
    .toLowerCase();
  if (t === "basic" || t === "pro" || t === "free") return t;
  return "free";
}

/** True if the user may create another project (currentCount is total existing projects). */
export function canCreateProject(plan: string, currentProjectCount: number): boolean {
  const max = hasAccess(plan, "maxProjects");
  const cap = typeof max === "number" ? max : 0;
  if (!Number.isFinite(cap) || cap === Number.POSITIVE_INFINITY) return true;
  return currentProjectCount < cap;
}

/** True if the user may create another client (currentCount is total existing clients). */
export function canCreateClient(plan: string, currentClientCount: number): boolean {
  const max = hasAccess(plan, "maxClients");
  const cap = typeof max === "number" ? max : 0;
  if (!Number.isFinite(cap) || cap === Number.POSITIVE_INFINITY) return true;
  return currentClientCount < cap;
}

/** True if adding `addCount` clients at once stays within the plan cap. */
export function canAddClients(plan: string, currentClientCount: number, addCount: number): boolean {
  if (addCount < 1) return true;
  const max = hasAccess(plan, "maxClients");
  const cap = typeof max === "number" ? max : 0;
  if (!Number.isFinite(cap) || cap === Number.POSITIVE_INFINITY) return true;
  return currentClientCount + addCount <= cap;
}

/** Daily AI request cap for the plan; Infinity means unlimited. */
export function getAiDailyCap(plan: string): number {
  const v = hasAccess(plan, "aiRequests");
  return typeof v === "number" ? v : 0;
}

export function canViewRateInsights(plan: string): boolean {
  return hasAccess(plan, "rateInsights") === true;
}

export function canUseInvoiceFeatures(plan: string): boolean {
  return hasAccess(plan, "invoiceFeatures") === true;
}

export function canUseActiveTimer(plan: string): boolean {
  return hasAccess(plan, "activeTimer") === true;
}
