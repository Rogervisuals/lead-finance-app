import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n/locale";
import type { FullUi } from "@/lib/i18n/get-ui";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { fetchSubscriptionLimitsPayload } from "@/lib/subscription/limits-data";
import { getStripe } from "@/lib/stripe/server";
import { scheduleFieldsFromStripeSubscription } from "@/lib/billing/sync-subscription-webhook";
import type { PlanId } from "@/lib/subscription/types";

function formatSubscriptionPeriodEnd(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-US", {
    dateStyle: "long",
  }).format(d);
}

export type SettingsBillingSectionData = {
  plan: PlanId;
  limitsResult: Awaited<ReturnType<typeof fetchSubscriptionLimitsPayload>>;
  hasStripeCustomerId: boolean;
  showCancelledRenewal: boolean;
  copy: {
    currentPlan: string;
    limitsHeading: string;
    projects: string;
    clients: string;
    unlimited: string;
    upgradeHeading: string;
    manageHeading: string;
    manageBody: string;
    openPortal: string;
    portalOpening: string;
    portalFailed: string;
    cancelledLabel: string;
    cancelledBody: string;
    billingAiRequests: string;
    billingFeatureBusiness: string;
    billingFeatureRateInsights: string;
    billingFeatureInvoices: string;
    billingFeatureTimer: string;
    billingFeatureIncluded: string;
    billingFeatureNotIncluded: string;
    billingFeatureInvoicesProBadge: string;
  };
  comparePlansCopy: {
    heading: string;
    intro: string;
    previewBadge: string;
    yourPlanBadge: string;
    recommendedBadge: string;
    usageDash: string;
  };
};

/**
 * Data for {@link BillingSubscriptionClient} on the settings page (same as former /settings/billing).
 */
export async function loadSettingsBillingSection(
  supabase: SupabaseClient,
  userId: string,
  locale: Locale,
  ui: FullUi,
  existingPlan?: PlanId
): Promise<SettingsBillingSectionData> {
  const plan =
    existingPlan ?? (await ensureSubscriptionAndGetPlan(supabase, userId));
  const limitsResult = await fetchSubscriptionLimitsPayload(supabase, userId, plan);

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select(
      "stripe_customer_id, stripe_subscription_id, cancel_at_period_end, subscription_current_period_end"
    )
    .eq("user_id", userId)
    .maybeSingle();

  type SubRow = {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    cancel_at_period_end?: boolean | null;
    subscription_current_period_end?: string | null;
  };
  const row = subRow as SubRow | null;
  const hasStripeCustomerId = Boolean(row?.stripe_customer_id);

  let stripeSaysCancelAtPeriodEnd = Boolean(row?.cancel_at_period_end);
  let periodEndIso = row?.subscription_current_period_end ?? null;

  if (!stripeSaysCancelAtPeriodEnd && row?.stripe_subscription_id && plan !== "free") {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      const schedule = scheduleFieldsFromStripeSubscription(sub);
      stripeSaysCancelAtPeriodEnd = schedule.cancel_at_period_end;
      periodEndIso = schedule.subscription_current_period_end ?? periodEndIso;

      if (schedule.cancel_at_period_end || schedule.subscription_current_period_end) {
        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: schedule.cancel_at_period_end,
            subscription_current_period_end: schedule.subscription_current_period_end,
          })
          .eq("user_id", userId);
      }
    } catch {
      // Ignore Stripe/network errors; UI still reflects DB state.
    }
  }

  const cancelledBody =
    stripeSaysCancelAtPeriodEnd && plan !== "free"
      ? periodEndIso
        ? ui.settings.billingCancelledWithDate.replace(
            "{{date}}",
            formatSubscriptionPeriodEnd(periodEndIso, locale)
          )
        : ui.settings.billingCancelledNoDate
      : null;

  const copy = {
    currentPlan: ui.settings.billingCurrentPlan,
    limitsHeading: ui.settings.billingLimitsHeading,
    projects: ui.settings.billingProjects,
    clients: ui.settings.billingClients,
    unlimited: ui.settings.billingUnlimited,
    upgradeHeading: ui.settings.billingUpgradeHeading,
    manageHeading: ui.settings.billingManageHeading,
    manageBody: ui.settings.billingManageBody,
    openPortal: ui.settings.billingOpenPortal,
    portalOpening: ui.settings.billingPortalOpening,
    portalFailed: ui.settings.billingPortalFailed,
    cancelledLabel: ui.settings.billingCancelledLabel,
    cancelledBody: cancelledBody ?? "",
    billingAiRequests: ui.settings.billingAiRequests,
    billingFeatureBusiness: ui.settings.billingFeatureBusiness,
    billingFeatureRateInsights: ui.settings.billingFeatureRateInsights,
    billingFeatureInvoices: ui.settings.billingFeatureInvoices,
    billingFeatureTimer: ui.settings.billingFeatureTimer,
    billingFeatureIncluded: ui.settings.billingFeatureIncluded,
    billingFeatureNotIncluded: ui.settings.billingFeatureNotIncluded,
    billingFeatureInvoicesProBadge: ui.settings.billingFeatureInvoicesProBadge,
  };

  const comparePlansCopy = {
    heading: ui.settings.billingComparePlansHeading,
    intro: ui.settings.billingComparePlansIntro,
    previewBadge: ui.settings.billingComparePreviewBadge,
    yourPlanBadge: ui.settings.billingCompareYourPlanBadge,
    recommendedBadge: ui.settings.billingCompareRecommendedBadge,
    usageDash: ui.settings.billingCompareUsageDash,
  };

  const showCancelledRenewal = Boolean(cancelledBody);

  return {
    plan,
    limitsResult,
    hasStripeCustomerId,
    showCancelledRenewal,
    copy,
    comparePlansCopy,
  };
}
