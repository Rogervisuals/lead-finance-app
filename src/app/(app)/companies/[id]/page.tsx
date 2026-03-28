import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRate } from "@/lib/finance/format";
import {
  CurrencyWithUsd,
  HourlyRateWithUsd,
} from "@/components/display/CurrencyWithUsd";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = params.id;

  const { data: company } = await supabase
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/companies");

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const baseCurrency = settings.base_currency;

  const { data: clients } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  const clientIds = (clients ?? []).map((c: { id: string }) => c.id);
  if (clientIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-zinc-500">
          <Link href="/companies" className="hover:underline">
            Companies
          </Link>{" "}
          / <span className="text-zinc-300">{company.name}</span>
        </div>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-sm text-zinc-400">
          No clients linked to this company yet. Edit a client and choose this
          organization.
        </p>
      </div>
    );
  }

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

  let companyIncome = 0;
  let companyHours = 0;
  const rows = (clients ?? []).map((c: { id: string; name: string }) => {
    const inc = incomeByClient.get(c.id) ?? 0;
    const hrs = hoursByClient.get(c.id) ?? 0;
    companyIncome += inc;
    companyHours += hrs;
    return {
      id: c.id,
      name: c.name,
      income: inc,
      hours: hrs,
      rate: safeRate(inc, hrs),
    };
  });

  const companyAvgRate = safeRate(companyIncome, companyHours);

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
          Clients linked to this organization and their contribution (net income
          ex VAT, hours from tracked time).
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
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
        <div className="rounded-xl border border-amber-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total hours</div>
          <div className="mt-2 text-2xl font-semibold text-amber-200">
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

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Clients
        </h2>
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
    </div>
  );
}
