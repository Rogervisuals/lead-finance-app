import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locale";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { fetchSubscriptionLimitsPayload } from "@/lib/subscription/limits-data";
import { BillingSubscriptionClient } from "@/components/billing/BillingSubscriptionClient";
import { getStripe } from "@/lib/stripe/server";
import {
  scheduleFieldsFromStripeSubscription,
} from "@/lib/billing/sync-subscription-webhook";

function formatSubscriptionPeriodEnd(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-US", {
    dateStyle: "long",
  }).format(d);
}

export const dynamic = "force-dynamic";

export default async function SettingsBillingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = getServerLocale();
  const ui = getUi(locale);
  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const limitsResult = await fetchSubscriptionLimitsPayload(supabase, user.id, plan);

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select(
      "stripe_customer_id, stripe_subscription_id, cancel_at_period_end, subscription_current_period_end"
    )
    .eq("user_id", user.id)
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

  // Fallback: if DB isn't updated yet, fetch schedule from Stripe so the UI reflects
  // "cancel at period end" immediately after a user cancels in the portal.
  if (!stripeSaysCancelAtPeriodEnd && row?.stripe_subscription_id && plan !== "free") {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      const schedule = scheduleFieldsFromStripeSubscription(sub);
      stripeSaysCancelAtPeriodEnd = schedule.cancel_at_period_end;
      periodEndIso = schedule.subscription_current_period_end ?? periodEndIso;

      // Persist for future requests (RLS allows user to update their own row).
      if (schedule.cancel_at_period_end || schedule.subscription_current_period_end) {
        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: schedule.cancel_at_period_end,
            subscription_current_period_end: schedule.subscription_current_period_end,
          })
          .eq("user_id", user.id);
      }
    } catch {
      // Ignore Stripe/network errors; page still renders with DB state.
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
    noCustomer: ui.settings.billingNoCustomer,
    cancelledLabel: ui.settings.billingCancelledLabel,
    cancelledBody: cancelledBody ?? "",
  };

  const showCancelledRenewal = Boolean(cancelledBody);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            {ui.settings.billingPageTitle}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
            {ui.settings.billingPageSubtitle}
          </p>
        </div>
        <Link
          href="/settings"
          className="shrink-0 rounded-lg border border-zinc-800/90 bg-zinc-950/50 px-3.5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
        >
          {ui.settings.billingBackToSettings}
        </Link>
      </div>

      <div className="mt-10">
        {!limitsResult.ok ? (
          <div
            className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/95"
            role="alert"
          >
            {ui.settings.billingLimitsError}
          </div>
        ) : (
          <BillingSubscriptionClient
            plan={plan}
            limits={limitsResult.data}
            hasStripeCustomerId={hasStripeCustomerId}
            showCancelledRenewal={showCancelledRenewal}
            copy={copy}
          />
        )}
      </div>
    </div>
  );
}
