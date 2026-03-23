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

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ clients, hasCompanyLink }, companies] = await Promise.all([
    selectClientsForUser(supabase, user.id),
    selectCompaniesForUser(supabase, user.id),
  ]);

  const companyNameById = new Map(
    companies.map((c) => [c.id, c.name])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Add clients you work with and track their projects.
          </p>
        </div>
      </div>

      {!hasCompanyLink ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          <strong className="font-medium">Company linking needs a DB update:</strong>{" "}
          Run <code className="text-amber-100">supabase/migrations/20260318_companies.sql</code> in the
          Supabase SQL Editor to enable organizations. Until then, your clients still show below using
          the original company text field — nothing was deleted.
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Create a client
        </h2>
        <form action={createClientAction} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Name *</span>
            <input
              required
              name="name"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Email</span>
            <input
              name="email"
              type="email"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          {hasCompanyLink ? (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-zinc-300">Company (optional)</span>
              <select
                name="company_id"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                defaultValue=""
              >
                <option value="">No company</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                <Link href="/companies" className="text-sky-400 hover:underline">
                  Manage companies
                </Link>{" "}
                to add an organization.
              </p>
            </label>
          ) : (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-zinc-300">Company (text)</span>
              <input
                name="company"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="Optional label until DB migration is applied"
              />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Notes</span>
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
              Add client
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Existing clients
        </h2>
        {clients?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Company</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2 text-right">Actions</th>
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
                          {companyNameById.get(c.company_id) ?? "Company"}
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
                          Edit
                        </Link>
                        <form action={deleteClientAction}>
                          <input type="hidden" name="id" value={c.id} />
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No clients yet.
          </div>
        )}
      </section>
    </div>
  );
}

