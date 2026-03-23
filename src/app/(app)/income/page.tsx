import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatISODate,
} from "@/lib/finance/format";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import { IncomeCurrencyFields } from "@/components/forms/IncomeCurrencyFields";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import {
  addIncomeTemplateFromIncomeAction,
  createIncomeFromTemplateAction,
  createIncomeAction,
  deleteIncomeAction,
  deleteIncomeTemplateAction,
} from "../server-actions/income";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

function incomeMatchesTemplate(
  row: {
    amount_converted: number | string | null;
    client_id: string | null;
    project_id: string | null;
    description: string | null;
  },
  t: {
    amount: number | string | null;
    client_id: string | null;
    project_id: string | null;
    description: string | null;
  }
) {
  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  if (cents(row.amount_converted) !== cents(t.amount)) return false;
  if (String(row.client_id ?? "") !== String(t.client_id ?? "")) return false;
  const rp = row.project_id ?? null;
  const tp = t.project_id ?? null;
  if (rp !== tp) return false;
  return (row.description ?? "").trim() === (t.description ?? "").trim();
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams?: { template_error?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const settings = await getOrCreateUserFinancialSettings(user.id);
  const vatEnabled = settings.vat_enabled;
  const vatRate = settings.vat_percentage / 100;
  const baseCurrency = settings.base_currency;

  const [
    { data: clients },
    { data: projects },
    { data: templates },
    { data: incomeRows },
    { data: incomeAll },
  ] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id,name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("projects")
        .select("id,name,client_id")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("income_templates")
        .select("id,client_id,project_id,amount,description,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("income")
        .select(
          "id,date,amount_original,amount_converted,currency,description,client_id,project_id,created_at"
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(50),
      supabase.from("income").select("amount_converted").eq("user_id", user.id),
    ]);

  const clientById = new Map((clients ?? []).map((c: any) => [c.id, c.name]));
  const projectById = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

  // Stored amounts are EX VAT (net); totals use base currency (amount_converted).
  const totalNet = (incomeAll ?? []).reduce(
    (acc: number, r: any) => acc + Number(r.amount_converted ?? 0),
    0
  );
  const totalGross = vatEnabled
    ? totalNet * (1 + vatRate)
    : totalNet;
  const totalVat = vatEnabled ? totalNet * vatRate : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Income</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track payments received from clients.
        </p>
      </div>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-900/50 bg-zinc-900/20 p-4 lg:p-5">
          <div className="text-sm text-zinc-400">Income (excl VAT)</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-300 lg:text-4xl">
            {formatCurrency(totalNet, baseCurrency)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            In {baseCurrency} (converted from foreign entries).
          </div>
        </div>
        <div className="grid gap-3">
          <StatCard
            title={`VAT (${settings.vat_percentage}%)`}
            value={formatCurrency(totalVat, baseCurrency)}
            accent="text-amber-300"
            border="border-amber-900/40"
          />
          <StatCard
            title={vatEnabled ? "Total income (incl VAT)" : "Total income"}
            value={formatCurrency(totalGross, baseCurrency)}
            accent="text-emerald-300"
            border="border-emerald-900/50"
          />
        </div>
      </section>

      {!vatEnabled ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          VAT disabled
        </div>
      ) : null}

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Add income
        </h2>
        {searchParams?.error === "exchange_rate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            Enter a positive exchange rate when the currency differs from your base
            currency ({baseCurrency}).
          </div>
        ) : null}
        <form
          action={createIncomeAction}
          className="grid min-w-0 gap-3 sm:grid-cols-2 [&>label]:min-w-0"
        >
          <ClientProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
          />

          <label className="min-w-0 space-y-1">
            <span className="text-sm text-zinc-300">Date *</span>
            <input
              required
              name="date"
              type="date"
              className="w-full min-w-0 max-w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <IncomeCurrencyFields baseCurrency={baseCurrency} />

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <input
              name="description"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              disabled={!clients?.length}
            >
              Save income
            </button>
            {!clients?.length ? (
              <p className="text-xs text-zinc-500">
                Create at least one client first.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Quick income templates
        </h2>
        {searchParams?.template_error === "duplicate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            This income is already saved as a template.
          </div>
        ) : null}
        {templates?.length ? (
          <div className="flex flex-wrap gap-2">
            {templates.map((t: any) => {
              const clientName = clientById.get(t.client_id) ?? "Client";
              const projectName = t.project_id
                ? projectById.get(t.project_id)
                : null;
              const labelPrefix = projectName
                ? `${clientName} / ${projectName}`
                : clientName;
              const label = `${labelPrefix} ${formatCurrency(Number(t.amount ?? 0), baseCurrency)}`;
              return (
                <div
                  key={t.id}
                  className="relative inline-flex max-w-full items-stretch"
                >
                  <form action={createIncomeFromTemplateAction}>
                    <input type="hidden" name="template_id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-800 bg-zinc-950/30 py-1.5 pl-3 pr-8 text-left text-xs text-zinc-200 hover:bg-zinc-950/50"
                    >
                      {label}
                    </button>
                  </form>
                  <form
                    action={deleteIncomeTemplateAction}
                    className="absolute right-0 top-0"
                  >
                    <input type="hidden" name="template_id" value={t.id} />
                    <button
                      type="submit"
                      title="Remove template"
                      aria-label="Remove template"
                      className="flex h-6 w-6 items-center justify-center rounded-tr-md text-sm leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      ×
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            No templates yet. Use &quot;Add to regulars&quot; on an income item.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Recent income
        </h2>

        {incomeRows?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Client / Project</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="min-w-[17rem] py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {incomeRows.map((r: any) => {
                  const alreadyRegular = (templates ?? []).some((t: any) =>
                    incomeMatchesTemplate(r, t)
                  );
                  return (
                  <tr key={r.id}>
                    <td className="py-2 text-zinc-300">{formatISODate(r.date)}</td>
                    <td className="py-2 text-zinc-200">
                      {r.project_id ? (
                        <>
                          {clientById.get(r.client_id) ?? "—"} /{" "}
                          {projectById.get(r.project_id) ?? "—"}
                        </>
                      ) : (
                        clientById.get(r.client_id) ?? "—"
                      )}
                    </td>
                    <td className="py-2 text-zinc-400">
                      {r.description ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <IncomeAmountDisplay
                        row={r}
                        baseCurrency={baseCurrency}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={addIncomeTemplateFromIncomeAction}>
                          <input type="hidden" name="income_id" value={r.id} />
                          <button
                            type="submit"
                            disabled={alreadyRegular}
                            title={
                              alreadyRegular
                                ? "Already saved as a quick template"
                                : "Save as quick template"
                            }
                            className="shrink-0 whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-950/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-950/20"
                          >
                            Add to regulars
                          </button>
                        </form>
                        <Link
                          href={`/income/${r.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          Edit
                        </Link>
                        <form action={deleteIncomeAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No income entries yet.
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

