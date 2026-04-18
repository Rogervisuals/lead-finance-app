import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODate, safeRate } from "@/lib/finance/format";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import {
  CurrencyWithUsd,
  HourlyRateWithUsd,
} from "@/components/display/CurrencyWithUsd";
import { StatCard } from "@/components/display/StatCard";
import { DashboardBlockHint } from "@/components/dashboard/DashboardBlockHint";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { sumDashboardEstimatedTax } from "@/lib/finance/company-tax";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import type { Locale } from "@/lib/i18n/locale";
import { canExportDataPdf, canViewRateInsights } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { InsightLockedState } from "@/components/subscription/RateInsightLock";
import { DashboardDataExportPdfControl } from "@/components/dashboard/DashboardDataExportPdfControl";
import {
  DASHBOARD_RANGE_MIN_YEAR,
  formatMonthYearLabel,
  formatYearLabel,
  resolveDashboardOrCustomRange,
  toISODateOnly,
} from "@/lib/dashboard-date-range";
import { getYearsWithActivityInRange } from "@/lib/dashboard-user-active-years";
import { buildGettingStartedState } from "@/lib/dashboard-getting-started";
import { DashboardGettingStarted } from "@/components/dashboard/DashboardGettingStarted";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { range?: string; upgrade?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userId = user.id;

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();

  // Ensure `user_settings` exists before reading checklist row + counts (avoids a race on first visit).
  const [plan, settings, activeYears] = await Promise.all([
    ensureSubscriptionAndGetPlan(supabase, userId),
    getOrCreateUserFinancialSettings(userId),
    getYearsWithActivityInRange(supabase, userId, DASHBOARD_RANGE_MIN_YEAR, year, "dashboard"),
  ]);

  const [{ data: checklistRow }, clientCountRes, projectCountRes, incomeCountRes, expenseCountRes] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select(
          "financial_settings_saved_at,business_name,invoice_logo_path",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("income").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  const gettingStarted = buildGettingStartedState(plan, checklistRow, {
    clients: clientCountRes.count ?? 0,
    projects: projectCountRes.count ?? 0,
    income: incomeCountRes.count ?? 0,
    expenses: expenseCountRes.count ?? 0,
  });
  const rateInsights = canViewRateInsights(plan);
  const exportDataPdf = canExportDataPdf(plan);

  const locale = getServerLocale();
  const ui = getUi(locale);

  const vatEnabled = settings.vat_enabled;
  const vatRate = settings.vat_percentage / 100;
  const baseCurrency = settings.base_currency;
  const { kind, label, monthStart, monthEndExclusive } = resolveDashboardOrCustomRange({
    year,
    monthIndex0,
    range: searchParams?.range,
    from: null,
    to: null,
    locale,
    allTimeLabel: ui.dashboard.allTimeLabel,
  });

  const isoStart = monthStart ? toISODateOnly(monthStart) : null;
  const isoEndExclusive = monthEndExclusive ? toISODateOnly(monthEndExclusive) : null;
  const isoEndInclusive = isoEndExclusive;

  // Start tax calculation early so it can run in parallel with the main dashboard queries.
  // This preserves behavior (same inputs / same result) but removes a waterfall.
  const estimatedTaxPromise = sumDashboardEstimatedTax(
    supabase,
    userId,
    settings.tax_percentage,
    kind === "all"
      ? { kind: "all" }
      : {
          kind: "month",
          startIso: isoStart!,
          endExclusiveIso: isoEndExclusive!,
        }
  );

  const [
    { data: clients },
    { data: projects },
    { data: incomeMonthSumRows },
    { data: expensesMonthSumRows },
    { data: incomeRecentRows },
    { data: expenseRecentRows },
    { data: hoursRows },
    { data: incomeAllRows },
    { data: hoursAllRows },
    estimatedTax,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,client_id")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    (kind === "all"
      ? supabase
          .from("income")
          .select("amount_converted", { count: "exact", head: false })
          .eq("user_id", userId)
      : supabase
          .from("income")
          .select("amount_converted", { count: "exact", head: false })
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lte("date", isoEndInclusive!)) as any,
    (kind === "all"
      ? supabase
          .from("expenses")
          .select("amount_converted", { count: "exact", head: false })
          .eq("user_id", userId)
      : supabase
          .from("expenses")
          .select("amount_converted", { count: "exact", head: false })
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lte("date", isoEndInclusive!)) as any,
    (kind === "all"
      ? supabase
          .from("income")
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(5)
      : supabase
          .from("income")
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lte("date", isoEndInclusive!)
          .order("date", { ascending: false })
          .limit(5)) as any,
    (kind === "all"
      ? supabase
          .from("expenses")
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(5)
      : supabase
          .from("expenses")
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lte("date", isoEndInclusive!)
          .order("date", { ascending: false })
          .limit(5)) as any,
    (kind === "all"
      ? supabase
          .from("hours")
          .select("hours,project_id,client_id")
          .eq("user_id", userId)
      : supabase
          .from("hours")
          .select("hours,project_id,client_id")
          .eq("user_id", userId)
          .gte("start_time", monthStart!.toISOString())
          .lt("start_time", monthEndExclusive!.toISOString())) as any,
    supabase
      .from("income")
      .select("amount_converted,client_id,project_id")
      .eq("user_id", userId)
      .limit(1000),
    supabase
      .from("hours")
      .select("hours,project_id,client_id")
      .eq("user_id", userId)
      .limit(1000),
    estimatedTaxPromise,
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const incomeMonth = (incomeMonthSumRows ?? []).reduce(
    (acc: number, row: any) => acc + Number(row?.amount_converted ?? 0),
    0
  );

  const expensesMonth = (expensesMonthSumRows ?? []).reduce(
    (acc: number, row: any) => acc + Number(row?.amount_converted ?? 0),
    0
  );

  const projectToClient = new Map<string, string>(
    (projects ?? []).map((p: any) => [p.id, p.client_id])
  );

  const hoursByClientInRange = new Map<string, number>();
  for (const r of hoursRows ?? []) {
    let cid = (r as any).client_id as string | null | undefined;
    if (!cid) {
      const pid = (r as any).project_id as string | null;
      if (pid) cid = projectToClient.get(pid) ?? null;
    }
    if (!cid) continue;
    hoursByClientInRange.set(
      cid,
      (hoursByClientInRange.get(cid) ?? 0) + Number((r as any).hours ?? 0),
    );
  }

  // Hourly rate widgets are ALL-TIME so they match client pages.
  const incomeByClientAll = new Map<string, number>();

  for (const r of incomeAllRows ?? []) {
    let cid = (r as any).client_id as string | null | undefined;
    if (!cid) {
      const pid = (r as any).project_id as string | null;
      if (pid) cid = projectToClient.get(pid) ?? null;
    }
    if (!cid) continue;
    incomeByClientAll.set(
      cid,
      (incomeByClientAll.get(cid) ?? 0) + Number((r as any).amount_converted ?? 0)
    );
  }

  const hoursByClientAll = new Map<string, number>();
  for (const r of hoursAllRows ?? []) {
    let cid = (r as any).client_id as string | null | undefined;
    if (!cid) {
      const pid = (r as any).project_id as string | null;
      if (pid) cid = projectToClient.get(pid) ?? null;
    }
    if (!cid) continue;
    hoursByClientAll.set(
      cid,
      (hoursByClientAll.get(cid) ?? 0) + Number((r as any).hours ?? 0)
    );
  }

  const totalHoursAll = Array.from(hoursByClientAll.values()).reduce((a, b) => a + b, 0);
  const totalIncomeAll = Array.from(incomeByClientAll.values()).reduce((a, b) => a + b, 0);
  const avgRateAll = safeRate(totalIncomeAll, totalHoursAll);

  const clientRates = (clients ?? [])
    .map((c: any) => {
      const cid = c.id as string;
      const income = incomeByClientAll.get(cid) ?? 0;
      const rate = safeRate(income, hoursByClientAll.get(cid) ?? 0);
      return { id: cid, name: c.name as string, rate, income };
    })
    .filter((x) => x.rate != null) as Array<{
    id: string;
    name: string;
    rate: number;
    income: number;
  }>;

  const bestClient = clientRates.length
    ? clientRates.reduce((best, cur) => (cur.rate > best.rate ? cur : best))
    : null;

  // Worst client should only consider clients who have actually paid (income > 0).
  const paidClientRates = clientRates.filter((c) => c.income > 0);
  const worstClient = paidClientRates.length
    ? paidClientRates.reduce((worst, cur) => (cur.rate < worst.rate ? cur : worst))
    : null;

  // Simplified model: income values are EX VAT.
  const incomeExclVat = incomeMonth;
  const netMonth = incomeExclVat - expensesMonth;
  const safeToSpend = netMonth - estimatedTax;
  const incomeInclVat = vatEnabled
    ? incomeExclVat * (1 + vatRate)
    : incomeExclVat;
  const vatAmount = vatEnabled ? incomeExclVat * vatRate : 0;

  const recent = [
    ...(incomeRecentRows ?? []).map((r: any) => ({
      kind: "income" as const,
      ...r,
    })),
    ...(expenseRecentRows ?? []).map((r: any) => ({
      kind: "expense" as const,
      ...r,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const candidateYears = Array.from(
    { length: Math.max(0, year - DASHBOARD_RANGE_MIN_YEAR + 1) },
    (_, i) => year - i
  );
  const rangeYearMatch = /^year-(\d{4})$/.exec(searchParams?.range ?? "");
  const selectedYear =
    rangeYearMatch != null ? Number(rangeYearMatch[1]) : null;

  let yearOptions = candidateYears
    .filter((y) => activeYears.has(y))
    .map((y) => ({
      value: `year-${y}`,
      label: formatYearLabel(y, locale),
    }));

  if (
    selectedYear != null &&
    selectedYear >= DASHBOARD_RANGE_MIN_YEAR &&
    selectedYear <= year &&
    !yearOptions.some((o) => o.value === `year-${selectedYear}`)
  ) {
    yearOptions = [
      {
        value: `year-${selectedYear}`,
        label: formatYearLabel(selectedYear, locale),
      },
      ...yearOptions,
    ];
  }

  const monthOptions = Array.from({ length: monthIndex0 + 1 }).map((_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      value: `month-${year}-${m}`,
      label: formatMonthYearLabel(year, i, locale),
    };
  });

  const taxReportPdfHref =
    searchParams?.range != null && searchParams.range !== ""
      ? `/api/tax-report-pdf?range=${encodeURIComponent(searchParams.range)}`
      : "/api/tax-report-pdf";

  return (
    <div className="min-w-0 space-y-6">
      <DashboardGettingStarted
        progressDone={gettingStarted.progressDone}
        progressTotal={gettingStarted.progressTotal}
        allDone={gettingStarted.allDone}
        items={gettingStarted.items}
        title={ui.dashboard.gettingStartedTitle}
        progressTemplate={ui.dashboard.gettingStartedProgress}
        allDoneTitle={ui.dashboard.gettingStartedAllDoneTitle}
        allDoneBody={ui.dashboard.gettingStartedAllDoneBody}
        upgradeLabel={ui.dashboard.gettingStartedUpgrade}
        labels={{
          baseCurrency: ui.dashboard.gettingStartedBaseCurrency,
          vat: ui.dashboard.gettingStartedVat,
          tax: ui.dashboard.gettingStartedTax,
          client: ui.dashboard.gettingStartedClient,
          project: ui.dashboard.gettingStartedProject,
          income: ui.dashboard.gettingStartedIncome,
          expense: ui.dashboard.gettingStartedExpense,
          invoice: ui.dashboard.gettingStartedInvoice,
        }}
      />

      {searchParams?.upgrade === "business" ? (
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Business features are not included in your current plan. Upgrade to access mileage and
          general expenses.
        </div>
      ) : null}
      {searchParams?.upgrade === "invoices" ? (
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Invoices (create, PDFs, and the invoices hub) are available on the Pro plan. Upgrade to
          unlock invoice features.
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full text-center md:w-auto md:text-left">
          <h1 className="text-2xl font-semibold">{ui.dashboard.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ui.dashboard.summaryFor}{" "}
            <span className="text-zinc-200">{label}</span>
          </p>
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row md:w-auto md:justify-end">
          <DashboardDataExportPdfControl
            href={taxReportPdfHref}
            canExport={exportDataPdf}
            label={ui.dashboard.exportDataPdf}
            lockedTitle={ui.dashboard.exportDataPdfProOnly}
          />
          <form method="get" action="/dashboard" className="flex gap-2">
            <select
              name="range"
              defaultValue={
                searchParams?.range ??
                `month-${year}-${String(monthIndex0 + 1).padStart(2, "0")}`
              }
              className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 outline-none"
            >
              <option value="all">{ui.dashboard.rangeAllTime}</option>
              {yearOptions.map((y) => (
                <option value={y.value} key={y.value}>
                  {y.label}
                </option>
              ))}
              {monthOptions.map((m) => (
                <option value={m.value} key={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
            >
              {ui.dashboard.view}
            </button>
          </form>
        </div>
      </div>

      <section className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.dashboard.mainFinancialBlock}
        </h2>
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
          <div
            className="min-w-0 rounded-xl border border-sky-900/40 bg-zinc-950/50 p-6 md:col-span-2 xl:col-span-2 xl:row-span-2"
            data-fin-card="net"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm text-zinc-400">{ui.dashboard.netMonth}</div>
              <DashboardBlockHint>
                <p>{ui.dashboard.netMonthHint}</p>
              </DashboardBlockHint>
            </div>
            <div className="mt-4 min-w-0">
              <CurrencyWithUsd
                amount={netMonth}
                currency={baseCurrency}
                primaryClassName="text-4xl font-semibold tabular-nums text-sky-300 sm:text-5xl"
                usdClassName="mt-1.5 text-sm font-medium tabular-nums text-sky-200/75"
              />
            </div>
          </div>
          <div
            className="min-w-0 rounded-xl border border-emerald-900/40 bg-zinc-950/30 p-4"
            data-fin-card="income"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm text-zinc-400">{ui.dashboard.incomeExclVat}</div>
              <DashboardBlockHint>
                <p>{ui.dashboard.incomeExclVatHint}</p>
              </DashboardBlockHint>
            </div>
            <div className="mt-2 min-w-0">
              <CurrencyWithUsd
                amount={incomeExclVat}
                currency={baseCurrency}
                primaryClassName="text-lg font-semibold tabular-nums text-emerald-300"
                usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
              />
            </div>
          </div>
          <div
            className="min-w-0 rounded-xl border border-rose-900/40 bg-zinc-950/30 p-4"
            data-fin-card="expenses"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm text-zinc-400">{ui.dashboard.expensesMonth}</div>
              <DashboardBlockHint>
                <p>{ui.dashboard.expensesMonthHint}</p>
              </DashboardBlockHint>
            </div>
            <div className="mt-2 min-w-0">
              <CurrencyWithUsd
                amount={expensesMonth}
                currency={baseCurrency}
                primaryClassName="text-lg font-semibold tabular-nums text-rose-300"
                usdClassName="mt-1 text-xs tabular-nums text-rose-200/70"
              />
            </div>
          </div>
          <div
            className="min-w-0 rounded-xl border border-amber-900/40 bg-zinc-950/30 p-4"
            data-fin-card="tax"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm text-zinc-400">
                {ui.dashboard.estimatedTax} ({settings.tax_percentage}%)
              </div>
              <DashboardBlockHint>
                <p>
                  {ui.dashboard.estimatedTaxIntro}{" "}
                  <Link href="/companies" className="text-sky-400 hover:underline">
                    {ui.dashboard.estimatedTaxLinkCompany}
                  </Link>{" "}
                  {ui.dashboard.estimatedTaxAnd}{" "}
                  <Link href="/clients" className="text-sky-400 hover:underline">
                    {ui.dashboard.estimatedTaxLinkClient}
                  </Link>{" "}
                  {ui.dashboard.estimatedTaxRest}
                </p>
              </DashboardBlockHint>
            </div>
            <div className="mt-2 min-w-0">
              <CurrencyWithUsd
                amount={estimatedTax}
                currency={baseCurrency}
                primaryClassName="text-lg font-semibold tabular-nums text-amber-300"
                usdClassName="mt-1 text-xs tabular-nums text-amber-200/70"
              />
            </div>
          </div>
          <div
            className="min-w-0 rounded-xl border border-cyan-900/40 bg-zinc-950/30 p-4"
            data-fin-card="safe-to-spend"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm text-zinc-400">{ui.dashboard.safeToSpend}</div>
              <DashboardBlockHint>
                <p>{ui.dashboard.safeToSpendHint}</p>
              </DashboardBlockHint>
            </div>
            <div className="mt-2 min-w-0">
              <CurrencyWithUsd
                amount={safeToSpend}
                currency={baseCurrency}
                primaryClassName="text-lg font-semibold tabular-nums text-cyan-300"
                usdClassName="mt-1 text-xs tabular-nums text-cyan-200/70"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.dashboard.insights}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <CompactInsightCard
            icon="📈"
            label={ui.dashboard.bestClient}
            accent="emerald"
            hint={
              <DashboardBlockHint>
                <p>{ui.dashboard.bestClientHint}</p>
              </DashboardBlockHint>
            }
          >
            {!rateInsights ? (
              <InsightLockedState />
            ) : bestClient ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium leading-snug text-zinc-300">
                  {bestClient.name}
                </div>
                <HourlyRateWithUsd
                  rate={bestClient.rate}
                  currency={baseCurrency}
                  primaryClassName="text-2xl font-semibold tracking-tight text-emerald-300"
                  usdClassName="mt-1.5 text-xs tabular-nums text-emerald-200/70"
                />
              </div>
            ) : (
              <span className="text-sm text-zinc-500">—</span>
            )}
          </CompactInsightCard>
          <CompactInsightCard
            icon="📉"
            label={ui.dashboard.worstClient}
            accent="rose"
            hint={
              <DashboardBlockHint>
                <p>{ui.dashboard.worstClientHint}</p>
              </DashboardBlockHint>
            }
          >
            {!rateInsights ? (
              <InsightLockedState />
            ) : worstClient ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium leading-snug text-zinc-300">
                  {worstClient.name}
                </div>
                <HourlyRateWithUsd
                  rate={worstClient.rate}
                  currency={baseCurrency}
                  primaryClassName="text-2xl font-semibold tracking-tight text-rose-300"
                  usdClassName="mt-1.5 text-xs tabular-nums text-rose-200/70"
                />
              </div>
            ) : (
              <span className="text-sm text-zinc-500">—</span>
            )}
          </CompactInsightCard>
          <div className="sm:col-span-2">
            <CompactInsightCard
              icon="⏱"
              label={ui.dashboard.avgHourlyRate}
              accent="sky"
              hint={
                <DashboardBlockHint>
                  <p>{ui.dashboard.avgHourlyRateHint}</p>
                </DashboardBlockHint>
              }
            >
              {!rateInsights ? (
                <InsightLockedState />
              ) : (
                <HourlyRateWithUsd
                  rate={avgRateAll}
                  currency={baseCurrency}
                  primaryClassName="text-2xl font-semibold tracking-tight text-sky-300"
                  usdClassName="mt-1.5 text-xs tabular-nums text-sky-200/75"
                />
              )}
            </CompactInsightCard>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">{ui.dashboard.vatSection}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            title={ui.dashboard.totalIncomeInclVat}
            hint={
              <DashboardBlockHint>
                <p>{ui.dashboard.totalIncomeInclVatHint}</p>
              </DashboardBlockHint>
            }
            value={
              <CurrencyWithUsd
                amount={incomeInclVat}
                currency={baseCurrency}
                primaryClassName="text-xl font-semibold text-emerald-200"
                usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
              />
            }
            accent="text-emerald-200"
            border="border-emerald-900/40"
            valueClassName="mt-2"
          />
          <StatCard
            title={`${ui.dashboard.vatPrefix} (${settings.vat_percentage}%) ${ui.dashboard.vatToPay}`}
            hint={
              <DashboardBlockHint>
                <p>{ui.dashboard.vatToPayHint}</p>
              </DashboardBlockHint>
            }
            value={
              <CurrencyWithUsd
                amount={vatAmount}
                currency={baseCurrency}
                primaryClassName="text-xl font-semibold text-amber-200"
                usdClassName="mt-1 text-xs tabular-nums text-amber-200/70"
              />
            }
            accent="text-amber-200"
            border="border-amber-900/40"
            valueClassName="mt-2"
          />
        </div>
      </section>

      {!vatEnabled ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          {ui.dashboard.vatDisabled}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.activity.recentTitle}
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            {ui.activity.empty}
          </div>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">{ui.table.date}</th>
                  <th className="py-2">{ui.table.type}</th>
                  <th className="py-2">{ui.table.clientProject}</th>
                  <th className="py-2">{ui.table.description}</th>
                  <th className="py-2 text-right">{ui.table.amount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recent.map((r: any) => {
                  const client = clientById.get(r.client_id)?.name;
                  const project = r.project_id
                    ? projectById.get(r.project_id)?.name
                    : null;
                  const title = project ? `${client ?? "—"} / ${project}` : (client ?? "—");
                  return (
                    <tr key={`${r.kind}-${r.id}`} className="align-top">
                      <td className="py-2 text-zinc-300">
                        {formatISODate(r.date)}
                      </td>
                      <td className="py-2 text-zinc-400">
                        {r.kind === "income" ? ui.activity.income : ui.activity.expense}
                      </td>
                      <td className="py-2 text-zinc-200">{title}</td>
                      <td className="py-2 text-zinc-400">
                        {r.description ?? "—"}
                      </td>
                      <td className="py-2 text-right">
                        {r.kind === "income" ? (
                          <IncomeAmountDisplay
                            row={r}
                            baseCurrency={baseCurrency}
                          />
                        ) : (
                          <IncomeAmountDisplay
                            row={r}
                            baseCurrency={baseCurrency}
                            accentClassName="text-rose-300"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Matches financial block cards: colored border + bg-zinc-950/30 */
const insightAccentBorder: Record<
  "emerald" | "rose" | "sky",
  string
> = {
  emerald: "border-emerald-900/40",
  rose: "border-rose-900/40",
  sky: "border-sky-900/40",
};

function CompactInsightCard({
  icon,
  label,
  accent,
  hint,
  children,
}: {
  icon: string;
  label: string;
  accent: keyof typeof insightAccentBorder;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-insight-card
      data-insight-accent={accent}
      className={`group flex h-full min-h-[9.5rem] min-w-0 flex-col rounded-xl border bg-zinc-950/30 p-4 shadow-sm transition-[box-shadow,border-color] duration-200 hover:shadow-md ${insightAccentBorder[accent]}`}
    >
      <div
        className="flex items-start justify-between gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500"
        data-insight-label
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span aria-hidden className="shrink-0 text-sm opacity-90">
            {icon}
          </span>
          <span>{label}</span>
        </div>
        {hint ? <div className="shrink-0 normal-case">{hint}</div> : null}
      </div>
      <div
        className="my-4 shrink-0 border-t border-zinc-800/80"
        aria-hidden
      />
      <div className="flex flex-1 flex-col justify-start gap-0">{children}</div>
    </div>
  );
}

