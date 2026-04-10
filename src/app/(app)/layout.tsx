import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserOrNull, createSupabaseServerClient } from "@/lib/supabase/server";
import { THEME_COOKIE_NAME, type ThemeMode } from "@/lib/theme";
import { getNavbarDisplayLabel } from "@/lib/auth-display-name";
import { isAdminUser } from "@/lib/admin";
import { LazyAiCreateClientAssistant } from "@/components/ai/LazyAiCreateClientAssistant";
import { WelcomeUserMenu } from "@/components/auth/WelcomeUserMenu";
import { AppDeferredFeatures } from "@/components/performance/AppDeferredFeatures";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { MobileNav } from "@/components/nav/MobileNav";
import { LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/i18n/locale";
import { getUi } from "@/lib/i18n/get-ui";
import { ActiveTimerNavWithSuspense } from "@/components/timer/ActiveTimerNavWithSuspense";
import { getActiveTimerForUser } from "@/lib/active-timer";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { FinancialDisplayPrefsProvider } from "@/components/layout/FinancialDisplayPrefsProvider";
import { SubscriptionPlanProvider } from "@/contexts/SubscriptionPlanContext";
import { canUseActiveTimer, getAiDailyCap } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

/** Auth + cookies keep this segment dynamic; no explicit force-dynamic needed. */
const ENABLE_LINK_PREFETCH = process.env.NODE_ENV === "production";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  const cookieTheme = cookies().get(THEME_COOKIE_NAME)?.value;
  const serverTheme: ThemeMode = cookieTheme === "dark" ? "dark" : "light";

  const locale: Locale = parseLocale(cookies().get(LOCALE_COOKIE)?.value);
  const ui = getUi(locale);

  const displayName = getNavbarDisplayLabel(user);
  const admin = isAdminUser(user.email);

  const supabase = createSupabaseServerClient();

  const [plan, financial, initialTimer, clientsRes, projectsRes] = await Promise.all([
    ensureSubscriptionAndGetPlan(supabase, user.id),
    getOrCreateUserFinancialSettings(user.id),
    getActiveTimerForUser(user.id),
    supabase
      .from("clients")
      .select("id,name,email,company")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,client_id")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  /** Free plan: show Ask AI but open upgrade message only (see AiCreateClientAssistant). */
  const canUseAi = getAiDailyCap(plan) > 0;
  const canUseTimer = canUseActiveTimer(plan);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-zinc-950 text-zinc-50">
      <header className="relative z-50 border-b border-zinc-800/70 bg-zinc-950/50 backdrop-blur">
        <div className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <Link
                href="/dashboard"
                prefetch={ENABLE_LINK_PREFETCH}
                className="text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200"
              >
                Lead Finance
              </Link>
              {/* Debug: real plan from DB (subscriptions.plan); remove or gate when stable */}
              <span
                className="text-[10px] font-medium uppercase tracking-wide text-zinc-600"
                title="Current subscription plan from database"
              >
                Plan: {plan}
              </span>
            </div>
            <nav className="hidden gap-3 md:flex">
              <NavItem href="/dashboard">{ui.nav.dashboard}</NavItem>
              <NavItem href="/clients">{ui.nav.clients}</NavItem>
              <NavItem href="/projects">{ui.nav.projects}</NavItem>
              <NavDropdown title={ui.nav.finance}>
                <NavItem href="/income">{ui.nav.income}</NavItem>
                <NavItem href="/expenses">{ui.nav.expenses}</NavItem>
                <NavItem href="/hours">{ui.nav.hours}</NavItem>
                <NavItem href="/finance/invoices">{ui.nav.invoices}</NavItem>
              </NavDropdown>
              <NavDropdown title={ui.nav.business}>
                <NavItem href="/business/general-expenses">
                  {ui.nav.generalExpenses}
                </NavItem>
                <NavItem href="/business/mileage">{ui.nav.mileage}</NavItem>
              </NavDropdown>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher locale={locale} nav={ui.nav} />
            <ActiveTimerNavWithSuspense
              initialTimer={initialTimer}
              canUseTimer={canUseTimer}
              timerUpgradeMessage={ui.planGating.timerBody}
              clients={
                (clientsRes.data ?? []) as {
                  id: string;
                  name: string;
                  email: string | null;
                  company: string | null;
                }[]
              }
              projects={
                (projectsRes.data ?? []) as {
                  id: string;
                  name: string;
                  client_id: string;
                }[]
              }
            />
            <MobileNav
              displayName={displayName}
              serverTheme={serverTheme}
              showAdminFeedback={admin}
              ui={ui}
            />
            <WelcomeUserMenu
              displayName={displayName}
              serverTheme={serverTheme}
              showAdminFeedback={admin}
              ui={ui}
            />
          </div>
        </div>
      </header>
      <main className="relative z-0 mx-auto min-w-0 max-w-6xl px-4 py-6">
        <SubscriptionPlanProvider plan={plan}>
          <FinancialDisplayPrefsProvider comparisonCurrency={financial.comparison_currency}>
            {children}
          </FinancialDisplayPrefsProvider>
        </SubscriptionPlanProvider>
      </main>
      <AppDeferredFeatures enableLinkPrefetch={ENABLE_LINK_PREFETCH} />
      <LazyAiCreateClientAssistant canUseAi={canUseAi} />
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={ENABLE_LINK_PREFETCH}
      className="rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white"
    >
      {children}
    </Link>
  );
}

function NavDropdown({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white">
        {title} <span className="text-zinc-500">▾</span>
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-20 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="w-56 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-lg">
          <div className="flex flex-col gap-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

