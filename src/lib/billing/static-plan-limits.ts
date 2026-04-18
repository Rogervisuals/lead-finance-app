import { getAiDailyCap, hasAccess } from "@/lib/permissions";
import type { PlanId } from "@/lib/subscription/types";

/** Caps and flags for a plan tier (for compare-plans UI; not tied to live usage). */
export type StaticPlanLimits = {
  maxProjects: number | null;
  maxClients: number | null;
  aiDailyCap: number;
  businessFeatures: boolean;
  rateInsights: boolean;
  invoiceFeatures: boolean;
  activeTimer: boolean;
};

function finiteCap(value: boolean | number): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value === Number.POSITIVE_INFINITY) return null;
  return value;
}

export function getStaticLimitsForPlan(plan: PlanId): StaticPlanLimits {
  const maxP = hasAccess(plan, "maxProjects");
  const maxC = hasAccess(plan, "maxClients");
  return {
    maxProjects: finiteCap(maxP),
    maxClients: finiteCap(maxC),
    aiDailyCap: getAiDailyCap(plan),
    businessFeatures: hasAccess(plan, "businessFeatures") === true,
    rateInsights: hasAccess(plan, "rateInsights") === true,
    invoiceFeatures: hasAccess(plan, "invoiceFeatures") === true,
    activeTimer: hasAccess(plan, "activeTimer") === true,
  };
}
