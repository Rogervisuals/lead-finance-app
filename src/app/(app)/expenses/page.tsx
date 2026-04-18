import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODate } from "@/lib/finance/format";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import { IncomeCurrencyFields } from "@/components/forms/IncomeCurrencyFields";
import {
  createExpenseAction,
  deleteExpenseAction,
} from "../server-actions/expenses";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { DeleteLabel, EditLabel } from "@/components/icons/LabeledIcons";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ui = getUi(getServerLocale());
  const settings = await getOrCreateUserFinancialSettings(user.id);
  const baseCurrency = settings.base_currency;

  const [{ data: clients }, { data: projects }, { data: expenseRows }] =
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
        .from("expenses")
        .select(
          "id,date,amount_original,amount_converted,currency,category,description,client_id,project_id,created_at"
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(50),
    ]);

  const clientById = new Map((clients ?? []).map((c: any) => [c.id, c.name]));
  const projectById = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ui.expenses.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {ui.expenses.subtitle}
        </p>
      </div>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.expenses.addExpense}
        </h2>
        {searchParams?.error === "exchange_rate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            {ui.errors.incomeExchangeRate} ({baseCurrency}).
          </div>
        ) : null}
        <form
          action={createExpenseAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <ClientProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            clientLabel={ui.components.clientRequired}
            projectLabel={ui.components.projectOptional}
            noProjectLabel={ui.components.noProject}
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">{ui.income.dateRequired}</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <IncomeCurrencyFields baseCurrency={baseCurrency} />

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">{ui.expenses.category}</span>
            <select
              name="category"
              defaultValue="Travel"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="Travel">Travel</option>
              <option value="renting">renting</option>
              <option value="other">other</option>
            </select>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">{ui.common.description}</span>
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
              {ui.expenses.saveExpense}
            </button>
            {!clients?.length ? (
              <p className="text-xs text-zinc-500">
                {ui.expenses.needClientFirst}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.expenses.recentExpenses}
        </h2>

        {expenseRows?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">{ui.table.date}</th>
                  <th className="py-2">{ui.table.clientProject}</th>
                  <th className="py-2">{ui.expenses.category}</th>
                  <th className="py-2">{ui.table.description}</th>
                  <th className="py-2 text-right">{ui.table.amount}</th>
                  <th className="py-2 text-right">{ui.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {expenseRows.map((r: any) => (
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
                    <td className="py-2 text-zinc-400">{r.category ?? "General"}</td>
                    <td className="py-2 text-zinc-400">
                      {r.description ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <IncomeAmountDisplay
                        row={r}
                        baseCurrency={baseCurrency}
                        accentClassName="text-rose-300"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/expenses/${r.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          <EditLabel>{ui.common.edit}</EditLabel>
                        </Link>
                        <form action={deleteExpenseAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                          >
                            <DeleteLabel>{ui.common.delete}</DeleteLabel>
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            {ui.expenses.noEntries}
          </div>
        )}
      </section>
    </div>
  );
}

