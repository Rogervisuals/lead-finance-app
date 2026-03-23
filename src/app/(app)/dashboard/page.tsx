import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatHourlyRate,
  formatISODate,
  safeRate,
} from "@/lib/finance/format";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { updateFinancialSettingsAction } from "../server-actions/settings";

export const dynamic = "force-dynamic";

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function sumAmounts(rows: Array<{ amount: string | number | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
}

function sumIncomeConverted(
  rows: Array<{ amount_converted?: string | number | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.amount_converted ?? 0), 0);
}

function monthLabel(year: number, monthIndex0: number) {
  const d = new Date(year, monthIndex0, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function getRangeMeta({
  year,
  monthIndex0,
  range,
}: {
  year: number;
  monthIndex0: number;
  range?: string;
}) {
  const currentMonthStart = new Date(year, monthIndex0, 1);
  const currentMonthEndExclusive = new Date(year, monthIndex0 + 1, 1);

  if (!range) {
    return {
      kind: "month" as const,
      label: monthLabel(year, monthIndex0),
      monthStart: currentMonthStart,
      monthEndExclusive: currentMonthEndExclusive,
    };
  }

  if (range === "all") {
    return {
      kind: "all" as const,
      label: "All time",
      monthStart: null as Date | null,
      monthEndExclusive: null as Date | null,
    };
  }

  const monthMatch = /^month-(\d{4})-(\d{2})$/.exec(range);
  if (monthMatch) {
    const y = Number(monthMatch[1]);
    const m = Number(monthMatch[2]) - 1;
    const start = new Date(y, m, 1);
    const endExclusive = new Date(y, m + 1, 1);
    const label = monthLabel(y, m);
    return { kind: "month" as const, label, monthStart: start, monthEndExclusive: endExclusive };
  }

  // fallback
  return {
    kind: "month" as const,
    label: monthLabel(year, monthIndex0),
    monthStart: currentMonthStart,
    monthEndExclusive: currentMonthEndExclusive,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { range?: string; settings?: string; saved?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userId = user.id;
  const settings = await getOrCreateUserFinancialSettings(userId);
  const vatEnabled = settings.vat_enabled;
  const vatRate = settings.vat_percentage / 100;
  const taxRate = settings.tax_percentage / 100;
  const baseCurrency = settings.base_currency;
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const { kind, label, monthStart, monthEndExclusive } = getRangeMeta({
    year,
    monthIndex0,
    range: searchParams?.range,
  });

  const isoStart = monthStart ? toISODateOnly(monthStart) : null;
  const isoEndExclusive = monthEndExclusive ? toISODateOnly(monthEndExclusive) : null;

  const [
    { data: clients },
    { data: projects },
    { data: incomeMonthRows },
    { data: expenseMonthRows },
    { data: incomeRecentRows },
    { data: expenseRecentRows },
    { data: hoursRows },
    { data: incomeAllRows },
    { data: hoursAllRows },
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
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .order("date", { ascending: false })
      : supabase
          .from("income")
          .select(
            "id,amount_original,amount_converted,currency,date,description,project_id,client_id"
          )
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lt("date", isoEndExclusive!)
          .order("date", { ascending: false })) as any,
    (kind === "all"
      ? supabase
          .from("expenses")
          .select("amount,date,currency,description,project_id,client_id")
          .eq("user_id", userId)
          .order("date", { ascending: false })
      : supabase
          .from("expenses")
          .select("amount,date,currency,description,project_id,client_id")
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lt("date", isoEndExclusive!)
          .order("date", { ascending: false })) as any,
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
          .lt("date", isoEndExclusive!)
          .order("date", { ascending: false })
          .limit(5)) as any,
    (kind === "all"
      ? supabase
          .from("expenses")
          .select("amount,date,currency,description,project_id,client_id")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(5)
      : supabase
          .from("expenses")
          .select("amount,date,currency,description,project_id,client_id")
          .eq("user_id", userId)
          .gte("date", isoStart!)
          .lt("date", isoEndExclusive!)
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
      .select("amount_converted,client_id")
      .eq("user_id", userId),
    supabase
      .from("hours")
      .select("hours,project_id,client_id")
      .eq("user_id", userId),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const incomeMonth = sumIncomeConverted(incomeMonthRows ?? []);
  const expensesMonth = sumAmounts(expenseMonthRows ?? []);

  const projectToClient = new Map<string, string>(
    (projects ?? []).map((p: any) => [p.id, p.client_id])
  );

  const incomeByClientInRange = new Map<string, number>();
  for (const r of incomeMonthRows ?? []) {
    const cid = (r as any).client_id as string | null;
    if (!cid) continue;
    incomeByClientInRange.set(
      cid,
      (incomeByClientInRange.get(cid) ?? 0) +
        Number((r as any).amount_converted ?? 0),
    );
  }

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
    const cid = (r as any).client_id as string | null;
    if (!cid) continue;
    incomeByClientAll.set(
      cid,
      (incomeByClientAll.get(cid) ?? 0) +
        Number((r as any).amount_converted ?? 0),
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
      (hoursByClientAll.get(cid) ?? 0) + Number((r as any).hours ?? 0),
    );
  }

  const totalHoursAll = Array.from(hoursByClientAll.values()).reduce((a, b) => a + b, 0);
  const totalIncomeAll = Array.from(incomeByClientAll.values()).reduce((a, b) => a + b, 0);
  const avgRateAll = safeRate(totalIncomeAll, totalHoursAll);

  const clientRates = (clients ?? [])
    .map((c: any) => {
      const cid = c.id as string;
      const rate = safeRate(incomeByClientAll.get(cid) ?? 0, hoursByClientAll.get(cid) ?? 0);
      return { id: cid, name: c.name as string, rate };
    })
    .filter((x) => x.rate != null) as Array<{ id: string; name: string; rate: number }>;

  const bestClient = clientRates.length
    ? clientRates.reduce((best, cur) => (cur.rate > best.rate ? cur : best))
    : null;
  const worstClient = clientRates.length
    ? clientRates.reduce((worst, cur) => (cur.rate < worst.rate ? cur : worst))
    : null;

  // Simplified model: income values are EX VAT.
  const incomeExclVat = incomeMonth;
  const netMonth = incomeExclVat - expensesMonth;
  // Tax % applies to net profit for the period (after expenses), not gross income excl VAT.
  const estimatedTax = Math.max(0, netMonth) * taxRate;
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

  const monthOptions = Array.from({ length: monthIndex0 + 1 }).map((_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      value: `month-${year}-${m}`,
      label: monthLabel(year, i),
    };
  });
  const settingsOpen = searchParams?.settings === "open";
  const savedNotice = searchParams?.saved === "1";
  const dashboardBaseUrl = `/dashboard${
    searchParams?.range ? `?range=${encodeURIComponent(searchParams.range)}` : ""
  }`;
  const settingsOpenUrl = `/dashboard?${
    searchParams?.range ? `range=${encodeURIComponent(searchParams.range)}&` : ""
  }settings=open`;
  const settingsReturnTo = `/dashboard?${
    searchParams?.range ? `range=${encodeURIComponent(searchParams.range)}&` : ""
  }saved=1`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full text-center md:w-auto md:text-left">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Summary for <span className="text-zinc-200">{label}</span>
          </p>
        </div>
        <div className="flex w-full justify-center gap-2 md:w-auto md:justify-end">
          <form method="get" action="/dashboard" className="flex gap-2">
          <select
            name="range"
            defaultValue={
              searchParams?.range ??
              `month-${year}-${String(monthIndex0 + 1).padStart(2, "0")}`
            }
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value="all">Total (all time)</option>
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
            View
          </button>
          </form>
        </div>
        <div className="hidden gap-2 md:flex">
          <Link
            href={settingsOpen ? dashboardBaseUrl : settingsOpenUrl}
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Settings
          </Link>
        </div>
      </div>

      {savedNotice ? (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          New settings saved
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Link
            href={dashboardBaseUrl}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            aria-label="Close settings modal"
          />
          <section className="relative z-10 w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Settings</h3>
              <Link
                href={dashboardBaseUrl}
                className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-950/60"
              >
                Close
              </Link>
            </div>
            <form action={updateFinancialSettingsAction} className="grid gap-3">
              <input type="hidden" name="return_to" value={settingsReturnTo} />
              <label className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                <span className="text-sm text-zinc-200">VAT enabled</span>
                <input type="hidden" name="vat_enabled" value="false" />
                <input
                  name="vat_enabled"
                  type="checkbox"
                  value="true"
                  defaultChecked={vatEnabled}
                  className="h-4 w-4 accent-sky-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">VAT percentage</span>
                <input
                  required
                  name="vat_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={settings.vat_percentage}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">Tax percentage</span>
                <input
                  required
                  name="tax_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={settings.tax_percentage}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-500">Base currency</span>
                <input
                  readOnly
                  type="text"
                  defaultValue={settings.base_currency}
                  tabIndex={-1}
                  aria-readonly="true"
                  className="w-full cursor-not-allowed rounded-md border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 text-sm uppercase text-zinc-500 outline-none"
                />
                <span className="text-xs text-zinc-600">
                  Locked. Totals and converted income use this currency.
                </span>
              </label>
              <div className="pt-1">
                <button
                  type="submit"
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Save settings
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Main financial block
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
          <div className="rounded-xl border border-sky-900/40 bg-zinc-950/50 p-6 md:col-span-2 xl:col-span-2 xl:row-span-2">
            <div className="text-sm text-zinc-400">Net (month)</div>
            <div className="mt-4 text-5xl font-semibold text-sky-300">
              {formatCurrency(netMonth, baseCurrency)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-zinc-950/30 p-4">
            <div className="text-sm text-zinc-400">Income (excl VAT)</div>
            <div className="mt-2 text-lg font-semibold text-emerald-300">
              {formatCurrency(incomeExclVat, baseCurrency)}
            </div>
          </div>
          <div className="rounded-xl border border-rose-900/40 bg-zinc-950/30 p-4">
            <div className="text-sm text-zinc-400">Expenses (month)</div>
            <div className="mt-2 text-lg font-semibold text-rose-300">
              {formatCurrency(expensesMonth, baseCurrency)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-zinc-950/30 p-4">
            <div className="text-sm text-zinc-400">
              Estimated tax ({settings.tax_percentage}%)
            </div>
            <div className="mt-2 text-lg font-semibold text-amber-300">
              {formatCurrency(estimatedTax, baseCurrency)}
            </div>
          </div>
          <div className="rounded-xl border border-cyan-900/40 bg-zinc-950/30 p-4">
            <div className="text-sm text-zinc-400">Safe to spend</div>
            <div className="mt-2 text-lg font-semibold text-cyan-300">
              {formatCurrency(safeToSpend, baseCurrency)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Insights</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/25 p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CompactInsightCard
              icon="📈"
              label="Best client"
              value={
                bestClient
                  ? `${bestClient.name} (${formatHourlyRate(bestClient.rate, baseCurrency)})`
                  : "—"
              }
            />
            <CompactInsightCard
              icon="📉"
              label="Worst client"
              value={
                worstClient
                  ? `${worstClient.name} (${formatHourlyRate(worstClient.rate, baseCurrency)})`
                  : "—"
              }
            />
            <CompactInsightCard
              icon="⏱"
              label="Avg hourly rate"
              value={formatHourlyRate(avgRateAll)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">VAT</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            title="Total income (incl VAT)"
            value={formatCurrency(incomeInclVat, baseCurrency)}
            accent="text-emerald-200"
            border="border-emerald-900/40"
          />
          <StatCard
            title={`VAT (${settings.vat_percentage}%) to pay`}
            value={formatCurrency(vatAmount, baseCurrency)}
            accent="text-amber-200"
            border="border-amber-900/40"
          />
        </div>
      </section>

      {!vatEnabled ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          VAT disabled
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Recent activity
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No income or expenses yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Client / Project</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
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
                        {r.kind === "income" ? "Income" : "Expense"}
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
                          <span className="text-rose-300">
                            {formatCurrency(
                              Number(r.amount ?? 0),
                              r.currency ?? "EUR"
                            )}
                          </span>
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

function StatCard({
  title,
  value,
  accent,
  border,
}: {
  title: string;
  value: string;
  accent: string;
  border: string;
}) {
  return (
    <div className={`rounded-xl border ${border} bg-zinc-900/20 p-4`}>
      <div className="text-sm text-zinc-400">{title}</div>
      <div className={`mt-2 text-xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function CompactInsightCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3">
      <div className="text-xs text-zinc-400">
        <span className="mr-1">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

