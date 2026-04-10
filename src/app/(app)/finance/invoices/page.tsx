import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUseInvoiceFeatures } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { formatCurrency, formatISODateTime } from "@/lib/finance/format";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

type InvoiceRow = {
  id: string;
  total_amount: number | string | null;
  amount_ex_vat: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
  description: string | null;
  project_id: string | null;
  currency?: string | null;
  projects: { name: string } | null;
  clients: { name: string } | null;
};

function lineAmount(inv: InvoiceRow) {
  const t =
    inv.total_amount != null && inv.total_amount !== ""
      ? Number(inv.total_amount)
      : Number(inv.amount_ex_vat ?? 0);
  return Number.isFinite(t) ? t : 0;
}

function rowCurrency(inv: InvoiceRow): string {
  const c = String(inv.currency ?? "EUR").trim().toUpperCase();
  return c === "USD" ? "USD" : "EUR";
}

function formatTotalsByCurrency(rows: InvoiceRow[]): string {
  const map = new Map<string, number>();
  for (const r of rows) {
    const c = rowCurrency(r);
    map.set(c, (map.get(c) ?? 0) + lineAmount(r));
  }
  const parts = Array.from(map.entries()).map(([c, a]) =>
    formatCurrency(a, c)
  );
  return parts.join(" · ");
}

function monthSortKey(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthHeading(iso: string | null) {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  }).format(d);
}

export default async function FinanceInvoicesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const ui = getUi(getServerLocale());

  if (!canUseInvoiceFeatures(plan)) {
    return (
      <div className="mx-auto min-w-0 max-w-2xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-100">{ui.invoices.title}</h1>
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {ui.planGating.invoicesBody}
        </div>
      </div>
    );
  }

  const { data: raw } = await supabase
    .from("invoices")
    .select(
      `
      id,
      total_amount,
      amount_ex_vat,
      status,
      created_at,
      paid_at,
      description,
      project_id,
      currency,
      projects ( name ),
      clients ( name )
    `
    )
    .order("created_at", { ascending: false });

  const rows = (raw ?? []) as unknown as InvoiceRow[];

  const open = rows.filter((r) => String(r.status ?? "").toLowerCase() === "open");
  const paid = rows.filter((r) => String(r.status ?? "").toLowerCase() === "paid");

  const openTotalLabel = formatTotalsByCurrency(open);
  const paidTotalLabel = formatTotalsByCurrency(paid);

  const paidByMonth = new Map<
    string,
    { headingIso: string | null; items: InvoiceRow[] }
  >();

  for (const inv of paid) {
    const bucketIso = inv.paid_at ?? inv.created_at;
    const key = monthSortKey(bucketIso) || "unknown";
    if (!paidByMonth.has(key)) {
      paidByMonth.set(key, {
        headingIso: bucketIso,
        items: [],
      });
    }
    const g = paidByMonth.get(key)!;
    g.items.push(inv);
  }

  const monthKeys = Array.from(paidByMonth.keys()).sort((a, b) =>
    b.localeCompare(a)
  );

  function projectLabel(inv: InvoiceRow) {
    return inv.projects?.name?.trim() || "—";
  }

  function clientLabel(inv: InvoiceRow) {
    return inv.clients?.name?.trim() || "—";
  }

  function descLabel(inv: InvoiceRow) {
    const d = inv.description?.trim();
    return d || "—";
  }

  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{ui.invoices.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ui.invoices.subtitle}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-900/40 bg-zinc-900/20 p-5">
          <div className="text-sm font-medium text-zinc-400">Still to be paid</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-amber-200">
            {open.length ? openTotalLabel : formatCurrency(0, "EUR")}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {open.length} open invoice{open.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-zinc-900/20 p-5">
          <div className="text-sm font-medium text-zinc-400">Paid</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-emerald-300">
            {paid.length ? paidTotalLabel : formatCurrency(0, "EUR")}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {paid.length} paid invoice{paid.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Open invoices</h2>
          {open.length ? (
            <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/20">
              <table className="w-full min-w-[min(100%,560px)] text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pl-4 pr-2">Date</th>
                    <th className="py-2 pr-2">Project</th>
                    <th className="py-2 pr-2">Client</th>
                    <th className="py-2 pr-2">Description</th>
                    <th className="py-2 pr-2 text-right">CCY</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {open.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 pl-4 pr-2 text-zinc-400 whitespace-nowrap">
                        {inv.created_at ? formatISODateTime(inv.created_at) : "—"}
                      </td>
                      <td className="py-2.5 pr-2 text-zinc-300">
                        {inv.project_id ? (
                          <Link
                            href={`/projects/${inv.project_id}`}
                            className="text-sky-400 hover:underline"
                          >
                            {projectLabel(inv)}
                          </Link>
                        ) : (
                          projectLabel(inv)
                        )}
                      </td>
                      <td className="py-2.5 pr-2 text-zinc-400">{clientLabel(inv)}</td>
                      <td className="max-w-[12rem] truncate py-2.5 pr-2 text-zinc-500">
                        {descLabel(inv)}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-zinc-500">
                        {rowCurrency(inv)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-amber-200/90">
                        {formatCurrency(lineAmount(inv), rowCurrency(inv))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No open invoices.
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Paid (by month)</h2>
          {monthKeys.length ? (
            <div className="space-y-4">
              {monthKeys.map((key) => {
                const group = paidByMonth.get(key)!;
                const heading = monthHeading(group.headingIso);
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/30 px-4 py-3">
                      <span className="text-sm font-medium text-zinc-200">{heading}</span>
                      <span className="text-sm tabular-nums text-emerald-300">
                        {formatTotalsByCurrency(group.items)}
                      </span>
                    </div>
                    <div className="min-w-0 max-w-full overflow-x-auto">
                      <table className="w-full min-w-[min(100%,520px)] text-sm">
                        <thead className="text-left text-xs text-zinc-500">
                          <tr>
                            <th className="py-2 pl-4 pr-2">Paid</th>
                            <th className="py-2 pr-2">Project</th>
                            <th className="py-2 pr-2">Client</th>
                            <th className="py-2 pr-2">Description</th>
                            <th className="py-2 pr-2 text-right">CCY</th>
                            <th className="py-2 pr-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {[...group.items]
                            .sort(
                              (a, b) =>
                                new Date(b.paid_at ?? b.created_at ?? 0).getTime() -
                                new Date(a.paid_at ?? a.created_at ?? 0).getTime()
                            )
                            .map((inv) => (
                              <tr key={inv.id}>
                                <td className="py-2.5 pl-4 pr-2 text-zinc-400 whitespace-nowrap">
                                  {inv.paid_at
                                    ? formatISODateTime(inv.paid_at)
                                    : inv.created_at
                                      ? formatISODateTime(inv.created_at)
                                      : "—"}
                                </td>
                                <td className="py-2.5 pr-2 text-zinc-300">
                                  {inv.project_id ? (
                                    <Link
                                      href={`/projects/${inv.project_id}`}
                                      className="text-sky-400 hover:underline"
                                    >
                                      {projectLabel(inv)}
                                    </Link>
                                  ) : (
                                    projectLabel(inv)
                                  )}
                                </td>
                                <td className="py-2.5 pr-2 text-zinc-400">{clientLabel(inv)}</td>
                                <td className="max-w-[10rem] truncate py-2.5 pr-2 text-zinc-500">
                                  {descLabel(inv)}
                                </td>
                                <td className="py-2.5 pr-2 text-right text-zinc-500">
                                  {rowCurrency(inv)}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-200/90">
                                  {formatCurrency(lineAmount(inv), rowCurrency(inv))}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No paid invoices yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
