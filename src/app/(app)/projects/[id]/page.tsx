import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatISODateTime } from "@/lib/finance/format";
import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { getInvoiceLogoPublicUrl } from "@/lib/supabase/invoice-logo";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { canUseInvoiceFeatures } from "@/lib/permissions";
import { getUserPlanWithClient } from "@/lib/subscription/plan";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePdfDownloadButton } from "@/components/invoices/InvoicePdfDownloadButton";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  toggleInvoiceStatusAction,
} from "../../server-actions/invoices";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function sumIncomeConverted(
  rows: Array<{ amount_converted?: string | number | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.amount_converted ?? 0), 0);
}

function sumHours(rows: Array<{ hours?: string | number | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
}

function invoiceCurrencyLabel(c: string | null | undefined): "EUR" | "USD" {
  return String(c ?? "EUR").trim().toUpperCase() === "USD" ? "USD" : "EUR";
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: {
    page?: string;
    invoice_fx_error?: string;
    invoice_create_error?: string;
  };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = params.id;
  const pageRaw = Math.max(1, parseInt(String(searchParams?.page ?? "1"), 10) || 1);

  const [{ data: project, error: projectError }, plan] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,client_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    getUserPlanWithClient(supabase, user.id),
  ]);

  if (projectError || !project) {
    redirect("/projects");
  }

  const invoiceFeatures = canUseInvoiceFeatures(plan);

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const baseCurrency = settings.base_currency;

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id,name,email,company,company_id,address")
    .eq("id", project.client_id)
    .eq("user_id", user.id)
    .single();

  const companyName =
    (clientRow as any)?.company_id
      ? (
          await supabase
            .from("companies")
            .select("name")
            .eq("id", (clientRow as any).company_id)
            .eq("user_id", user.id)
            .maybeSingle()
        )?.data?.name ?? null
      : null;

  const { data: businessRow } = await supabase
    .from("user_settings")
    .select(
      "business_name,full_name,email,phone,website,iban,vat_number,kvk_number,address,invoice_logo_path"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const invoiceLogoUrl = getInvoiceLogoPublicUrl(
    (businessRow as { invoice_logo_path?: string | null })?.invoice_logo_path
  );

  const [
    { data: incomeRows },
    { data: expenseRows },
    { data: allHoursForTotals },
    { count: hourCount },
    invoicesRes,
  ] = await Promise.all([
    supabase
      .from("income")
      .select("amount_converted")
      .eq("user_id", user.id)
      .eq("project_id", projectId),
    supabase
      .from("expenses")
      .select("amount_converted")
      .eq("user_id", user.id)
      .eq("project_id", projectId),
    supabase
      .from("hours")
      .select("hours")
      .eq("user_id", user.id)
      .eq("project_id", projectId),
    supabase
      .from("hours")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("project_id", projectId),
    invoiceFeatures
      ? supabase
          .from("invoices")
          .select(
            "id,amount_ex_vat,vat_enabled,vat_percentage,vat_amount,total_amount,status,created_at,paid_at,description,quantity,currency"
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] | null }),
  ]);
  const invoicesRows = invoicesRes.data;

  const totalIncome = sumIncomeConverted(incomeRows ?? []);
  const totalExpenses = sumIncomeConverted(expenseRows ?? []);
  const totalHours = sumHours(allHoursForTotals ?? []);
  const totalHourEntries = hourCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHourEntries / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageRaw), totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: hourPageRows } = await supabase
    .from("hours")
    .select("id,start_time,end_time,hours,notes")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("start_time", { ascending: false })
    .range(from, to);

  const baseUrl = `/projects/${projectId}`;
  const queryFor = (p: number) =>
    p <= 1 ? baseUrl : `${baseUrl}?page=${p}`;

  const defaultInvoiceCurrency: "EUR" | "USD" =
    baseCurrency === "USD" ? "USD" : "EUR";
  const showInvoiceFxError = String(searchParams?.invoice_fx_error ?? "") === "1";
  const showInvoiceCreateError =
    String(searchParams?.invoice_create_error ?? "") === "1";

  return (
    <div className="min-w-0 space-y-6">
      {invoiceFeatures && showInvoiceCreateError ? (
        <div
          className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          The invoice could not be saved. If you recently added invoice currency, run
          database migrations so the <code className="rounded bg-zinc-900 px-1">invoices</code>{" "}
          table has a <code className="rounded bg-zinc-900 px-1">currency</code> column, then try
          again.
        </div>
      ) : null}
      {invoiceFeatures && showInvoiceFxError ? (
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Could not fetch an exchange rate to record income in your base currency (
          {baseCurrency}). Check your connection and try marking the invoice paid again.
        </div>
      ) : null}
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/projects" className="text-sky-400 hover:underline">
            Projects
          </Link>
          <span className="mx-1 text-zinc-600">/</span>
          <span className="text-zinc-400">{project.name}</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {clientRow ? (
            <>
              Client:{" "}
              <Link
                href={`/clients/${clientRow.id}`}
                className="text-sky-400 hover:underline"
              >
                {clientRow.name}
              </Link>
            </>
          ) : (
            "—"
          )}
          {project.status ? (
            <span className="ml-2 text-zinc-500">· {project.status}</span>
          ) : null}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Income (total, {baseCurrency})</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={totalIncome}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-emerald-300"
              usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-rose-900/45 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Expenses (total, {baseCurrency})</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={totalExpenses}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-rose-300"
              usdClassName="mt-1 text-xs tabular-nums text-rose-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 sm:col-span-2 lg:col-span-1">
          <div className="text-sm text-zinc-400">Total hours</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300">
            {totalHours.toFixed(2)}
          </div>
        </div>
      </section>

      {invoiceFeatures ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Invoices</h2>
            <CreateInvoiceModal
              clientName={clientRow?.name ?? "—"}
              projectName={project.name}
              projectId={projectId}
              vatPercentageDefault={settings.vat_percentage ?? 21}
              vatEnabledDefault={settings.vat_enabled}
              defaultInvoiceCurrency={defaultInvoiceCurrency}
              returnTo={baseUrl}
              createInvoiceAction={createInvoiceAction}
            />
          </div>

          {invoicesRows?.length ? (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2 text-right">Amount</th>
                    <th className="py-2 pr-2 text-right">CCY</th>
                    <th className="py-2 pr-2 text-right">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(invoicesRows ?? []).map((inv: any) => {
                    const created = inv.created_at
                      ? formatISODateTime(inv.created_at)
                      : "—";
                    const amount =
                      inv.total_amount != null
                        ? Number(inv.total_amount)
                        : Number(inv.amount_ex_vat ?? 0);
                    const invCcy = invoiceCurrencyLabel(inv.currency);
                    const status = String(inv.status ?? "open");
                    return (
                      <tr key={inv.id}>
                        <td className="py-2 pr-2 text-zinc-300">{created}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-zinc-200">
                          {formatCurrency(amount, invCcy)}
                        </td>
                        <td className="py-2 pr-2 text-right text-zinc-500">
                          {invCcy}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${
                              status === "paid"
                                ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-200"
                                : "border-amber-900/50 bg-amber-950/20 text-amber-200"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <InvoicePdfDownloadButton
                              invoice={inv}
                              client={{
                                name: clientRow?.name ?? "—",
                                email: (clientRow as any)?.email ?? null,
                                company: companyName ?? (clientRow as any)?.company ?? null,
                                address: (clientRow as any)?.address ?? null,
                              }}
                              project={{ name: project.name, description: null }}
                              business={{
                                business_name:
                                  (businessRow as any)?.business_name ?? "Rogervisuals",
                                full_name: (businessRow as any)?.full_name ?? null,
                                email: (businessRow as any)?.email ?? null,
                                phone: (businessRow as any)?.phone ?? null,
                                website: (businessRow as any)?.website ?? null,
                                iban: (businessRow as any)?.iban ?? null,
                                vat_number: (businessRow as any)?.vat_number ?? null,
                                kvk_number: (businessRow as any)?.kvk_number ?? null,
                                address: (businessRow as any)?.address ?? null,
                                invoice_logo_url: invoiceLogoUrl,
                              }}
                              currency={invCcy}
                            />
                            <form action={toggleInvoiceStatusAction}>
                              <input type="hidden" name="invoice_id" value={inv.id} />
                              <input type="hidden" name="return_to" value={baseUrl} />
                              <button
                                type="submit"
                                className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                              >
                                Mark {status === "paid" ? "open" : "paid"}
                              </button>
                            </form>
                            <form action={deleteInvoiceAction}>
                              <input type="hidden" name="invoice_id" value={inv.id} />
                              <input type="hidden" name="return_to" value={baseUrl} />
                              <button
                                type="submit"
                                className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-rose-200 hover:bg-zinc-950/40"
                                aria-label="Delete invoice"
                                title="Delete invoice"
                              >
                                🗑
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
              No invoices yet.
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Invoices</h2>
          <p className="mt-3 text-sm text-zinc-400">
            Creating invoices, PDFs, and the invoices hub are available on the Pro plan.{" "}
            <Link
              href="/finance/invoices"
              className="text-sky-400 underline-offset-2 hover:underline"
            >
              Go to invoices
            </Link>
            .
          </p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Logged hours</h2>
          {totalHourEntries > 0 ? (
            <p className="text-xs text-zinc-500">
              Showing {currentPage * PAGE_SIZE - PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalHourEntries)} of {totalHourEntries}
            </p>
          ) : null}
        </div>

        {hourPageRows?.length ? (
          <>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[min(100%,640px)] text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2">Start</th>
                    <th className="py-2 pr-2">End</th>
                    <th className="w-24 py-2 text-right">Hours</th>
                    <th className="min-w-0 py-2 pl-4 sm:min-w-[8rem]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {hourPageRows.map((row: any) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-2 text-zinc-300">
                        {formatISODateTime(row.start_time)}
                      </td>
                      <td className="py-2 pr-2 text-zinc-300">
                        {formatISODateTime(row.end_time)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-200">
                        {Number(row.hours ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2 pl-4 text-zinc-500">
                        {row.notes?.trim() ? row.notes : "—"}
                      </td>
                    </tr>
                  ))}
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
                      href={queryFor(currentPage - 1)}
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
                      href={queryFor(currentPage + 1)}
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
            No hours logged for this project yet.
          </div>
        )}
      </section>

      <div>
        <Link
          href={`/projects/${projectId}/edit`}
          className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
        >
          Edit project
        </Link>
      </div>
    </div>
  );
}
