import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteLabel } from "@/components/icons/LabeledIcons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  selectClientByIdForUser,
  selectCompaniesForUser,
} from "@/lib/supabase/schema-compat";
import {
  deleteClientAction,
  updateClientAction,
} from "../../../server-actions/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { return_to?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ client, hasCompanyLink }, companies] = await Promise.all([
    selectClientByIdForUser(supabase, user.id, params.id),
    selectCompaniesForUser(supabase, user.id),
  ]);

  if (!client) redirect("/clients");

  const returnTo = String(searchParams?.return_to ?? "").trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit client</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update client details. All data is scoped to your user.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form action={updateClientAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={client.id} />
          {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Name *</span>
            <input
              required
              name="name"
              defaultValue={client.name ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          {hasCompanyLink ? (
            <>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-zinc-300">Company (organization)</span>
                <select
                  name="company_id"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  defaultValue={client.company_id ?? ""}
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
                  </Link>
                </p>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-zinc-300">
                  Legacy company label (optional)
                </span>
                <input
                  name="company"
                  defaultValue={client.company ?? ""}
                  placeholder="Only if not using organization link above"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </label>
            </>
          ) : (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-zinc-300">Company</span>
              <input
                name="company"
                defaultValue={client.company ?? ""}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Notes</span>
            <input
              name="notes"
              defaultValue={client.notes ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <fieldset className="space-y-3 sm:col-span-2">
            <legend className="text-sm font-medium text-zinc-300">
              Invoice address
            </legend>
            <p className="text-xs text-zinc-500">
              Shown on invoices only. Street name and house number go in Address.
            </p>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Address</span>
              <input
                name="address"
                defaultValue={client.address ?? ""}
                placeholder="e.g. Main Street 42"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">Postal code</span>
                <input
                  name="postal_code"
                  defaultValue={client.postal_code ?? ""}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-zinc-300">City</span>
                <input
                  name="city"
                  defaultValue={client.city ?? ""}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </label>
            </div>
          </fieldset>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save changes
            </button>
          </div>
        </form>

        <form action={deleteClientAction} className="mt-4">
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
          >
            <DeleteLabel>Delete client</DeleteLabel>
          </button>
        </form>
      </section>
    </div>
  );
}

