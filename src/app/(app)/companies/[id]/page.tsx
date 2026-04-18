import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRate } from "@/lib/finance/format";
import {
  CurrencyWithUsd,
  HourlyRateWithUsd,
} from "@/components/display/CurrencyWithUsd";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import {
  estimateTaxOnCompanyIncome,
  roundMoney,
} from "@/lib/finance/company-tax";
import { updateCompanyTaxAction } from "@/app/(app)/server-actions/companies";

export const dynamic = "force-dynamic";

type CompanyRow = {
  id: string;
  name: string;
  tax_enabled: boolean;
};

const labelClass = "block text-sm font-medium text-zinc-200";
const hintClass = "mt-1.5 text-xs leading-relaxed text-zinc-500";

function ToggleSwitch({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="h-7 w-14 rounded-full border border-zinc-800 bg-zinc-900/30 transition-all duration-300 peer-checked:bg-zinc-100" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-zinc-100 shadow transition-all duration-300 peer-checked:translate-x-7 peer-checked:bg-zinc-950" />
    </label>
  );
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = params.id;
  const saved = searchParams?.saved === "1";

  const { data: companyRaw } = await supabase
    .from("companies")
    .select("id,name,tax_enabled")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  const company = companyRaw as CompanyRow | null;
  if (!company) redirect("/companies");

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const baseCurrency = settings.base_currency;
  const userTaxPct = settings.tax_percentage;

  const { data: clients } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  const clientIds = (clients ?? []).map((c: { id: string }) => c.id);

  let companyIncome = 0;
  let companyHours = 0;
  const rows: {
    id: string;
    name: string;
    income: number;
    hours: number;
    rate: number | null;
  }[] = [];

  if (clientIds.length > 0) {
    const { data: incomeRows } = await supabase
      .from("income")
      .select("client_id,amount_converted")
      .eq("user_id", user.id)
      .in("client_id", clientIds);

    const { data: hourRows } = await supabase
      .from("hours")
      .select("client_id,hours")
      .eq("user_id", user.id)
      .in("client_id", clientIds);

    const incomeByClient = new Map<string, number>();
    for (const r of incomeRows ?? []) {
      const cid = (r as { client_id: string }).client_id;
      incomeByClient.set(
        cid,
        (incomeByClient.get(cid) ?? 0) +
          Number((r as { amount_converted: unknown }).amount_converted ?? 0)
      );
    }

    const hoursByClient = new Map<string, number>();
    for (const r of hourRows ?? []) {
      const cid = (r as { client_id: string }).client_id;
      hoursByClient.set(
        cid,
        (hoursByClient.get(cid) ?? 0) + Number((r as { hours: unknown }).hours ?? 0)
      );
    }

    for (const c of clients ?? []) {
      const inc = incomeByClient.get(c.id) ?? 0;
      const hrs = hoursByClient.get(c.id) ?? 0;
      companyIncome += inc;
      companyHours += hrs;
      rows.push({
        id: c.id,
        name: c.name,
        income: inc,
        hours: hrs,
        rate: safeRate(inc, hrs),
      });
    }
  }

  const companyAvgRate = safeRate(companyIncome, companyHours);

  const taxEnabled = company.tax_enabled;
  const estimatedTax = estimateTaxOnCompanyIncome(
    companyIncome,
    userTaxPct,
    taxEnabled
  );
  const incomeAfterTax = taxEnabled
    ? roundMoney(companyIncome - estimatedTax)
    : roundMoney(companyIncome);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link href="/companies" className="hover:underline">
            Companies
          </Link>{" "}
          / <span className="text-zinc-300">{company.name}</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{company.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {clientIds.length === 0
            ? "No clients linked to this organization yet. Edit a client and choose this organization."
            : "Clients linked to this organization and their contribution (net income ex VAT, hours from tracked time)."}
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          Tax settings saved.
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Tax</h2>
        <p className="mt-1 text-sm text-zinc-500">
          When enabled, estimates below use your{" "}
          <strong className="font-medium text-zinc-400">Tax percentage</strong>{" "}
          from{" "}
          <Link href="/settings" className="text-sky-400 hover:underline">
            Settings → Financial settings
          </Link>{" "}
          ({userTaxPct}%).
        </p>

        <form action={updateCompanyTaxAction} className="mt-6">
          <input type="hidden" name="company_id" value={companyId} />
          <input
            type="hidden"
            name="return_to"
            value={`/companies/${companyId}`}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <div className={labelClass}>Apply tax for this company</div>
              <p className={`${hintClass} max-w-xl`}>
                Off: no tax is subtracted in the summary. On: estimated tax uses
                your global rate from Settings.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <input type="hidden" name="tax_enabled" value="false" />
              <ToggleSwitch name="tax_enabled" defaultChecked={taxEnabled} />
              <button
                type="submit"
                className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-emerald-900/50 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total income (net)</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={companyIncome}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-emerald-300"
              usdClassName="mt-1 text-sm tabular-nums text-emerald-200/75"
            />
          </div>
        </div>

        <div className="rounded-xl border border-rose-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Tax (estimate)</div>
          <div className="mt-2">
            {taxEnabled ? (
              <>
                <CurrencyWithUsd
                  amount={estimatedTax}
                  currency={baseCurrency}
                  primaryClassName="text-2xl font-semibold text-rose-200"
                  usdClassName="mt-1 text-sm tabular-nums text-rose-200/70"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  {userTaxPct}% from Settings
                </p>
              </>
            ) : (
              <p className="text-2xl font-semibold text-zinc-500">—</p>
            )}
          </div>
          {!taxEnabled ? (
            <p className="mt-1 text-xs text-zinc-500">Tax off for this company</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-teal-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Income after tax</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={incomeAfterTax}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-teal-200"
              usdClassName="mt-1 text-sm tabular-nums text-teal-200/75"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {taxEnabled ? "Total income − tax (estimate)" : "Same as total income"}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total hours</div>
          <div className="mt-2 text-2xl font-semibold text-amber-300">
            {companyHours.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-sky-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Avg. hourly rate</div>
          <div className="mt-2">
            <HourlyRateWithUsd
              rate={companyAvgRate}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-sky-300"
              usdClassName="mt-1 text-sm tabular-nums text-sky-200/75"
            />
          </div>
        </div>
      </section>

      {clientIds.length === 0 ? null : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Clients</h2>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Client</th>
                  <th className="py-2 text-right">Income</th>
                  <th className="py-2 text-right">Hours</th>
                  <th className="py-2 text-right">Effective rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">
                      <Link
                        href={`/clients/${r.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums text-emerald-300">
                      <CurrencyWithUsd
                        amount={r.income}
                        currency={baseCurrency}
                        primaryClassName="tabular-nums text-emerald-300"
                        usdClassName="mt-0.5 text-[11px] tabular-nums text-emerald-200/80"
                      />
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-300">
                      {r.hours.toFixed(2)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-300">
                      <HourlyRateWithUsd
                        rate={r.rate}
                        currency={baseCurrency}
                        align="right"
                        primaryClassName="tabular-nums text-zinc-300"
                        usdClassName="mt-0.5 text-[11px] tabular-nums text-zinc-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
