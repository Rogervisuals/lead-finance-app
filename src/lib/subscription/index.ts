/**
 * Subscription domain: DB-backed plans, ready for Stripe webhooks to upsert `subscriptions` rows.
 */

export {
  assertInvoiceFeaturesAllowed,
  ensureSubscriptionAndGetPlan,
  getUserPlan,
  getUserPlanWithClient,
} from "./plan";
export type { PlanId } from "./types";
