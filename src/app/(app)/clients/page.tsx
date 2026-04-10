import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  selectClientsForUser,
  selectCompaniesForUser,
} from "@/lib/supabase/schema-compat";
import {
  createClientAction,
  deleteClientAction,
} from "../server-actions/clients";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { canCreateClient, hasAccess } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const ui = getUi(getServerLocale());
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);

  const [{ clients, hasCompanyLink }, companies] = await Promise.all([
    selectClientsForUser(supabase, user.id),
    selectCompaniesForUser(supabase, user.id),
  ]);

  const companyNameById = new Map(
    companies.map((c) => [c.id, c.name])
  );

  const clientCount = clients?.length ?? 0;
  const allowCreate = canCreateClient(plan, clientCount);
  const maxClients = hasAccess(plan, "maxClients");
  const maxLabel =
    typeof maxClients === "number" && Number.isFinite(maxClients)
      ? String(maxClients)
      : "∞";
  const showLimitError =
    searchParams?.error === "client_limit" || searchParams?.error === "client_count";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ui.clients.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ui.clients.subtitle}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Plan: <span className="text-zinc-400">{plan}</span> — clients {clientCount} / {maxLabel}
          </p>
        </div>
      </div>

      {showLimitError ? (
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {searchParams?.error === "client_count"
            ? ui.clients.clientCountError
            : ui.clients.clientLimitBanner}
        </div>
      ) : null}

      {!hasCompanyLink ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          <strong className="font-medium">{ui.clients.companyDbBannerStrong}</strong>{" "}
          {ui.clients.companyDbBannerRest}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.clients.createTitle}
        </h2>
        {!allowCreate ? (
          <p className="text-sm text-zinc-500">
            {ui.clients.clientLimitForm
              .replace("{current}", String(clientCount))
              .replace("{max}", maxLabel)}
          </p>
        ) : (
        <form action={createClientAction} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">{ui.clients.nameRequired}</span>
            <input
              required
              name="name"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">{ui.common.email}</span>
            <input
              name="email"
              type="email"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          {hasCompanyLink ? (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-zinc-300">{ui.clients.companyOptional}</span>
              <select
                name="company_id"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                defaultValue=""
              >
                <option value="">{ui.common.noCompany}</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                <Link href="/companies" className="text-sky-400 hover:underline">
                  {ui.clients.manageCompaniesLink}
                </Link>{" "}
                {ui.common.addOrgHint}
              </p>
            </label>
          ) : (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-zinc-300">{ui.clients.companyText}</span>
              <input
                name="company"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder={ui.clients.companyTextPlaceholder}
              />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">{ui.common.notes}</span>
            <input
              name="notes"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              {ui.clients.addClient}
            </button>
          </div>
        </form>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.clients.existingTitle}
        </h2>
        {clients?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">{ui.table.name}</th>
                  <th className="py-2">{ui.table.email}</th>
                  <th className="py-2">{ui.table.company}</th>
                  <th className="py-2">{ui.table.notes}</th>
                  <th className="py-2 text-right">{ui.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {clients.map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-2">
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-2 text-zinc-400">{c.email ?? "—"}</td>
                    <td className="py-2 text-zinc-400">
                      {hasCompanyLink && c.company_id ? (
                        <Link
                          href={`/companies/${c.company_id}`}
                          className="text-sky-300 hover:underline"
                        >
                          {companyNameById.get(c.company_id) ?? ui.common.company}
                        </Link>
                      ) : c.company ? (
                        <span>{c.company}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-zinc-400">
                      {c.notes ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${c.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          {ui.common.edit}
                        </Link>
                        <form action={deleteClientAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                          >
                            {ui.common.delete}
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
            {ui.clients.empty}
          </div>
        )}
      </section>
    </div>
  );
}

