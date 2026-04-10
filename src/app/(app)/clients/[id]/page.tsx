import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { selectClientByIdForUser } from "@/lib/supabase/schema-compat";
import {
  formatISODate,
  formatISODateTime,
  safeRate,
} from "@/lib/finance/format";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import {
  CurrencyWithUsd,
  HourlyRateWithUsd,
} from "@/components/display/CurrencyWithUsd";
import { StatCard } from "@/components/display/StatCard";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import {
  estimateTaxOnCompanyIncome,
  roundMoney,
} from "@/lib/finance/company-tax";
import { ClientTaxToggle } from "@/components/clients/ClientTaxToggle";
import { canViewRateInsights } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { RateInsightLockInline } from "@/components/subscription/RateInsightLock";

export const dynamic = "force-dynamic";

const HOURS_PAGE_SIZE = 20;

function sumIncomeConverted(
  rows: Array<{ amount_converted?: string | number | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.amount_converted ?? 0), 0);
}

function sumHours(rows: Array<{ hours: string | number | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
}

export default async function ClientSummaryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { page?: string; saved?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const rateInsights = canViewRateInsights(plan);

  const clientId = params.id;
  const saved = searchParams?.saved === "1";
  const settings = await getOrCreateUserFinancialSettings(user.id);
  const vatEnabled = settings.vat_enabled;
  const vatRate = settings.vat_percentage / 100;
  const baseCurrency = settings.base_currency;

  const { client, hasCompanyLink } = await selectClientByIdForUser(
    supabase,
    user.id,
    clientId
  );

  if (!client) redirect("/clients");

  const { data: linkedCompany } =
    hasCompanyLink && client.company_id
      ? await supabase
          .from("companies")
          .select("id,name")
          .eq("id", client.company_id)
          .eq("user_id", user.id)
          .single()
      : { data: null as { id: string; name: string } | null };

  const [
    { data: projects, error: projectsError },
    { data: incomeRows, error: incomeError },
    { data: expenseRows, error: expenseError },
    { data: sameNameClients, error: sameNameError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,start_date,end_date,created_at")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("income")
      .select(
        "id,date,amount_original,amount_converted,currency,description,project_id"
      )
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("expenses")
      .select("amount_converted")
      .eq("client_id", clientId)
      .eq("user_id", user.id),
    supabase
      .from("clients")
      .select("id,email,company")
      .eq("user_id", user.id)
      .eq("name", client.name),
  ]);

  if (projectsError) throw new Error(projectsError.message);
  if (incomeError) throw new Error(incomeError.message);
  if (expenseError) throw new Error(expenseError.message);
  if (sameNameError) throw new Error(sameNameError.message);

  const pageRaw = Math.max(1, parseInt(String(searchParams?.page ?? "1"), 10) || 1);

  const [{ data: allHoursAgg }, { count: hoursCount }] = await Promise.all([
    supabase
      .from("hours")
      .select("hours,project_id")
      .eq("user_id", user.id)
      .eq("client_id", clientId),
    supabase
      .from("hours")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("client_id", clientId),
  ]);

  const totalHourEntries = hoursCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHourEntries / HOURS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageRaw), totalPages);
  const from = (currentPage - 1) * HOURS_PAGE_SIZE;
  const to = from + HOURS_PAGE_SIZE - 1;

  const { data: hourPageRows } = await supabase
    .from("hours")
    .select("id,project_id,client_id,start_time,end_time,hours,notes")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .order("start_time", { ascending: false })
    .range(from, to);

  const hoursClientBase = `/clients/${clientId}`;
  const hoursPageUrl = (p: number) =>
    p <= 1 ? hoursClientBase : `${hoursClientBase}?page=${p}`;

  const incomeTotal = sumIncomeConverted(incomeRows ?? []);
  const expenseTotal = sumIncomeConverted(expenseRows ?? []);
  const hoursTotal = sumHours(allHoursAgg ?? []);
  const overallRate = safeRate(incomeTotal, hoursTotal);
  // Revenue in base currency (`amount_converted`); original currency shown per row.
  const incomeNet = incomeTotal;
  const incomeGross = vatEnabled
    ? incomeNet * (1 + vatRate)
    : incomeNet;
  const vatAmount = vatEnabled ? incomeNet * vatRate : 0;

  /** Income (ex VAT) minus expenses; tax applies to this amount when tax is on. */
  const netIncome = roundMoney(incomeNet - expenseTotal);

  const clientTaxEnabled = Boolean(client.tax_enabled);
  const taxEstimated = estimateTaxOnCompanyIncome(
    netIncome,
    settings.tax_percentage,
    clientTaxEnabled
  );
  const incomeAfterTax = clientTaxEnabled
    ? roundMoney(netIncome - taxEstimated)
    : roundMoney(netIncome);

  const incomeByProject = new Map<string, number>();
  for (const r of incomeRows ?? []) {
    const pid = (r as any).project_id as string | null;
    if (!pid) continue;
    incomeByProject.set(
      pid,
      (incomeByProject.get(pid) ?? 0) + Number((r as any).amount_converted ?? 0)
    );
  }

  const hoursByProject = new Map<string, number>();
  let hoursClientOnly = 0;
  for (const r of allHoursAgg ?? []) {
    const pid = (r as any).project_id as string | null;
    if (pid) {
      hoursByProject.set(
        pid,
        (hoursByProject.get(pid) ?? 0) + Number((r as any).hours ?? 0)
      );
    } else {
      hoursClientOnly += Number((r as any).hours ?? 0);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-500">
            <Link href="/clients" className="hover:underline">
              Clients
            </Link>{" "}
            / <span className="text-zinc-300">{client.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
          <div className="mt-1 text-sm text-zinc-400">
            {client.email ? <span>{client.email}</span> : null}
            {client.email && (linkedCompany || client.company) ? (
              <span className="mx-2">•</span>
            ) : null}
            {linkedCompany ? (
              <Link
                href={`/companies/${linkedCompany.id}`}
                className="text-sky-300 hover:underline"
              >
                {linkedCompany.name}
              </Link>
            ) : client.company ? (
              <span>{client.company}</span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Client ID: <span className="text-zinc-400">{String(client.id).slice(0, 8)}…</span>
          </div>
          {client.notes ? (
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">{client.notes}</p>
          ) : null}

          {(sameNameClients?.length ?? 0) > 1 ? (
            <div className="mt-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
              Multiple clients share the name “{client.name}”. Your projects may be linked to a
              different one:
              <div className="mt-2 flex flex-wrap gap-2">
                {sameNameClients!.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className={`rounded-md border px-2 py-1 text-xs hover:bg-amber-950/30 ${
                      c.id === client.id
                        ? "border-amber-700/60 text-amber-100"
                        : "border-amber-900/40 text-amber-200"
                    }`}
                  >
                    {String(c.id).slice(0, 8)}…{c.email ? ` • ${c.email}` : ""}{c.company ? ` • ${c.company}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ClientTaxToggle
            clientId={clientId}
            defaultChecked={clientTaxEnabled}
          />
          <Link
            href={`/clients/${clientId}/edit`}
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Edit client
          </Link>
          <Link
            href="/hours/add"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Add hours
          </Link>
        </div>
      </div>

      {saved ? (
        <p className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          Tax setting saved.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projects"
          value={String((projects ?? []).length)}
          accent="text-sky-300"
          border="border-sky-900/40"
        />
        <StatCard
          title={vatEnabled ? "Income (all time, incl VAT)" : "Income (all time)"}
          value={
            <CurrencyWithUsd
              amount={incomeGross}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-emerald-300"
              usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
            />
          }
          accent="text-emerald-300"
          border="border-emerald-900/50"
          valueClassName="mt-2"
        />
        <StatCard
          title="Hours (all time)"
          value={hoursTotal.toFixed(2)}
          accent="text-amber-300"
          border="border-amber-900/40"
        />
        <StatCard
          title="Hourly rate"
          value={
            rateInsights ? (
              <HourlyRateWithUsd
                rate={overallRate}
                currency={baseCurrency}
                primaryClassName="text-xl font-semibold text-zinc-50"
                usdClassName="mt-1 text-xs tabular-nums text-zinc-400"
              />
            ) : (
              <div className="mt-1 flex items-center justify-start">
                <RateInsightLockInline size="md" />
              </div>
            )
          }
          accent="text-zinc-50"
          border="border-zinc-800"
          valueClassName="mt-2"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-amber-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">VAT ({settings.vat_percentage}%)</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={vatAmount}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-amber-300"
              usdClassName="mt-1 text-xs tabular-nums text-amber-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-emerald-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Income (ex VAT, all time)</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={incomeNet}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-emerald-200"
              usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-rose-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Expenses (all time)</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={expenseTotal}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-rose-300"
              usdClassName="mt-1 text-xs tabular-nums text-rose-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Net income</div>
          <p className="mt-0.5 text-xs text-zinc-500">Income (ex VAT) − expenses</p>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={netIncome}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-zinc-50"
              usdClassName="mt-1 text-xs tabular-nums text-zinc-400"
            />
          </div>
        </div>
        <div className="rounded-xl border border-rose-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">
            Tax (estimate, {settings.tax_percentage}%)
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Of net income when tax is on</p>
          <div className="mt-2">
            {clientTaxEnabled ? (
              <CurrencyWithUsd
                amount={taxEstimated}
                currency={baseCurrency}
                primaryClassName="text-xl font-semibold text-rose-200"
                usdClassName="mt-1 text-xs tabular-nums text-rose-200/70"
              />
            ) : (
              <p className="text-xl font-semibold text-zinc-500">—</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-teal-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Income after tax</div>
          <p className="mt-0.5 text-xs text-zinc-500">Net income − tax (estimate)</p>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={incomeAfterTax}
              currency={baseCurrency}
              primaryClassName="text-xl font-semibold text-teal-200"
              usdClassName="mt-1 text-xs tabular-nums text-teal-200/75"
            />
          </div>
        </div>
      </section>

      {!vatEnabled ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          VAT disabled
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Projects</h2>
        {projects?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Project</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Income</th>
                  <th className="py-2 text-right">Hours</th>
                  <th className="py-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {projects.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-zinc-400">{p.status ?? "—"}</td>
                    <td className="py-2 text-right text-zinc-200">
                      <CurrencyWithUsd
                        amount={incomeByProject.get(p.id) ?? 0}
                        currency={baseCurrency}
                        primaryClassName="tabular-nums text-zinc-200"
                        usdClassName="mt-0.5 text-[11px] tabular-nums text-zinc-500"
                      />
                    </td>
                    <td className="py-2 text-right text-zinc-200">
                      {(hoursByProject.get(p.id) ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-zinc-200">
                      {rateInsights ? (
                        <HourlyRateWithUsd
                          rate={safeRate(
                            incomeByProject.get(p.id) ?? 0,
                            hoursByProject.get(p.id) ?? 0
                          )}
                          currency={baseCurrency}
                          align="right"
                          primaryClassName="tabular-nums text-zinc-200"
                          usdClassName="mt-0.5 text-[11px] tabular-nums text-zinc-500"
                        />
                      ) : (
                        <div className="flex justify-end">
                          <RateInsightLockInline size="sm" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {hoursClientOnly > 0 ? (
                  <tr key="client-only-hours">
                    <td className="py-2 text-zinc-300 italic">No project</td>
                    <td className="py-2 text-zinc-500">—</td>
                    <td className="py-2 text-right text-zinc-500">—</td>
                    <td className="py-2 text-right text-zinc-200">
                      {hoursClientOnly.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-zinc-500">—</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No projects for this client yet.
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">
            Income
          </h2>
          {incomeRows?.length ? (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Project</th>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(incomeRows ?? []).slice(0, 20).map((r: any) => {
                    const projectName =
                      r.project_id
                        ? (projects ?? []).find((p: any) => p.id === r.project_id)?.name ?? "—"
                        : "—";
                    return (
                      <tr key={r.id}>
                        <td className="py-2 text-zinc-300">
                          {formatISODate(r.date)}
                        </td>
                        <td className="py-2 text-zinc-200">{projectName}</td>
                        <td className="py-2 text-zinc-400">
                          {r.description ?? "—"}
                        </td>
                        <td className="py-2 text-right">
                          <IncomeAmountDisplay
                            row={r}
                            baseCurrency={baseCurrency}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
              No income for this client yet.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Hours</h2>
            {totalHourEntries > 0 ? (
              <p className="text-xs text-zinc-500">
                Showing {currentPage * HOURS_PAGE_SIZE - HOURS_PAGE_SIZE + 1}–
                {Math.min(currentPage * HOURS_PAGE_SIZE, totalHourEntries)} of{" "}
                {totalHourEntries}
              </p>
            ) : null}
          </div>
          {hourPageRows?.length ? (
            <>
              <div className="min-w-0 max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-zinc-500">
                    <tr>
                      <th className="py-2">Project</th>
                      <th className="py-2">Start</th>
                      <th className="py-2">End</th>
                      <th className="py-2 text-right">Hours</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(hourPageRows ?? []).map((r: any) => {
                      const projectName = r.project_id
                        ? (projects ?? []).find((p: any) => p.id === r.project_id)?.name ?? "—"
                        : "No project";
                      return (
                        <tr key={r.id} className="align-top">
                          <td className="py-2 text-zinc-200">{projectName}</td>
                          <td className="py-2 text-zinc-400">
                            {formatISODateTime(r.start_time)}
                          </td>
                          <td className="py-2 text-zinc-400">
                            {formatISODateTime(r.end_time)}
                          </td>
                          <td className="py-2 text-right text-zinc-200">
                            {Number(r.hours ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2 text-zinc-400">{r.notes ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                  <div className="text-xs text-zinc-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={hoursPageUrl(currentPage - 1)}
                        className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600">
                        Previous
                      </span>
                    )}
                    {currentPage < totalPages ? (
                      <Link
                        href={hoursPageUrl(currentPage + 1)}
                        className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
              No hours logged for this client yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

