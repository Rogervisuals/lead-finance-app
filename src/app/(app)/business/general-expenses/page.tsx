import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { GeneralExpenseQuickTemplateButtons } from "@/components/business/GeneralExpenseQuickTemplateButtons";
import { IncomeCurrencyFields } from "@/components/forms/IncomeCurrencyFields";
import { IncomeAmountDisplay } from "@/components/display/IncomeAmountDisplay";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import {
  addGeneralExpenseTemplateFromExpenseAction,
  createBusinessExpenseAction,
  deleteBusinessExpenseAction,
} from "../../server-actions/business-expenses";

export const dynamic = "force-dynamic";

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthLabel(year: number, monthIndex0: number) {
  const dt = new Date(year, monthIndex0, 1);
  return dt.toLocaleString(undefined, { month: "long", year: "numeric" });
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
    return {
      kind: "month" as const,
      label: monthLabel(y, m),
      monthStart: start,
      monthEndExclusive: endExclusive,
    };
  }

  return {
    kind: "month" as const,
    label: monthLabel(year, monthIndex0),
    monthStart: currentMonthStart,
    monthEndExclusive: currentMonthEndExclusive,
  };
}

function sumAmounts(rows: Array<{ amount: string | number | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
}

/** Same rule as server: duplicate template = same amount (cents) + same trimmed notes. */
function expenseMatchesTemplate(
  expense: {
    amount: number | string | null;
    notes: string | null;
  },
  t: {
    amount: number | string | null;
    notes: string | null;
  }
) {
  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  if (cents(expense.amount) !== cents(t.amount)) return false;
  return (expense.notes ?? "").trim() === (t.notes ?? "").trim();
}

export default async function GeneralExpensesPage({
  searchParams,
}: {
  searchParams?: { template_error?: string; range?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  const monthOptions = Array.from({ length: monthIndex0 + 1 }).map((_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      value: `month-${year}-${m}`,
      label: monthLabel(year, i),
    };
  });

  const rowsQuery = (() => {
    let q = supabase
      .from("business_expenses")
      .select(
        "id,amount,amount_original,currency,exchange_rate,date,category,notes,created_at"
      )
      .eq("user_id", user.id);
    if (kind === "month" && isoStart && isoEndExclusive) {
      q = q.gte("date", isoStart).lt("date", isoEndExclusive);
    }
    return q.order("date", { ascending: false });
  })();

  const [{ data: rows }, { data: templates }, settings] = await Promise.all([
    rowsQuery,
    supabase
      .from("general_expenses_templates")
      .select("id,amount,category,notes,is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    getOrCreateUserFinancialSettings(user.id),
  ]);

  const totalSpendings = sumAmounts(rows ?? []);
  const baseCurrency = settings.base_currency;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full text-center md:w-auto md:text-left">
          <h1 className="text-2xl font-semibold">General expenses</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Summary for <span className="text-zinc-200">{label}</span>
          </p>
        </div>
        <div className="flex w-full justify-center gap-2 md:w-auto md:justify-end">
          <form
            method="get"
            action="/business/general-expenses"
            className="flex gap-2"
          >
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
      </div>

      <section className="rounded-xl border border-rose-900/40 bg-zinc-900/20 p-4 lg:p-5">
        <div className="text-sm text-zinc-400">Total spendings</div>
        <div className="mt-2">
          <CurrencyWithUsd
            amount={totalSpendings}
            currency={baseCurrency}
            primaryClassName="text-3xl font-semibold tabular-nums text-rose-300 lg:text-4xl"
            usdClassName="mt-1.5 text-sm font-medium tabular-nums text-rose-200/75"
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {kind === "all"
            ? "All recorded general expenses."
            : `Expenses with a date in ${label}.`}{" "}
          Totals use {baseCurrency} (foreign entries are converted).
        </p>
      </section>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Add expense
        </h2>
        {searchParams?.error === "exchange_rate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            Enter a positive exchange rate when the currency differs from your base
            currency ({baseCurrency}).
          </div>
        ) : null}
        <form
          action={createBusinessExpenseAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <IncomeCurrencyFields baseCurrency={baseCurrency} />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Category *</span>
            <select
              required
              name="category"
              defaultValue="Online services"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="Online services">Online services</option>
              <option value="Transport">Transport</option>
              <option value="events">events</option>
            </select>
          </label>

          <label className="space-y-1 sm:col-span-2 mt-2">
            <span className="text-sm text-zinc-300">Notes</span>
            <input
              name="notes"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add expense
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Quick expense templates
        </h2>
        {searchParams?.template_error === "duplicate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            This expense is already saved as a template.
          </div>
        ) : null}
        {templates?.length ? (
          <GeneralExpenseQuickTemplateButtons
            templates={(templates ?? []) as any}
            baseCurrency={baseCurrency}
          />
        ) : (
          <div className="text-sm text-zinc-500">
            No templates yet. Use &quot;Add to regulars&quot; on an expense.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Expenses</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Same period as total spendings ({label}). Use View to change the range.
        </p>
        {rows?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[min(100%,720px)] text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="w-28 whitespace-nowrap py-2 text-right">Amount</th>
                  <th className="min-w-0 py-2 pl-8 sm:min-w-[8rem]">Notes</th>
                  <th className="min-w-0 py-2 text-right sm:whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(rows ?? []).map((r: any) => {
                  const alreadyRegular = (templates ?? []).some((t: any) =>
                    expenseMatchesTemplate(r, t)
                  );
                  return (
                  <tr key={r.id}>
                    <td className="py-2 text-zinc-300">{r.date}</td>
                    <td className="py-2 text-zinc-400">
                      {r.category ?? "General"}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <IncomeAmountDisplay
                        row={{
                          amount_original:
                            r.amount_original != null
                              ? r.amount_original
                              : r.amount,
                          amount_converted: r.amount,
                          currency: r.currency ?? "EUR",
                        }}
                        baseCurrency={baseCurrency}
                        accentClassName="text-rose-300"
                      />
                    </td>
                    <td className="py-2 pl-8 text-zinc-400">{r.notes ?? "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={addGeneralExpenseTemplateFromExpenseAction}>
                          <input type="hidden" name="expense_id" value={r.id} />
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
                          href={`/business/general-expenses/${r.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          Edit
                        </Link>
                        <form action={deleteBusinessExpenseAction}>
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
            No expenses yet.
          </div>
        )}
      </section>
    </div>
  );
}

