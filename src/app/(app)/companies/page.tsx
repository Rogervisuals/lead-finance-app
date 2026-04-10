import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCompanyAction, deleteCompanyAction } from "../server-actions/companies";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id,name,created_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const { data: counts } = await supabase
    .from("clients")
    .select("company_id")
    .eq("user_id", user.id)
    .not("company_id", "is", null);

  const clientCountByCompany = new Map<string, number>();
  for (const row of counts ?? []) {
    const cid = (row as { company_id: string | null }).company_id;
    if (!cid) continue;
    clientCountByCompany.set(cid, (clientCountByCompany.get(cid) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ui.companies.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {ui.companies.subtitle}
        </p>
      </div>

      {searchParams?.error === "missing_name" ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          {ui.companies.errorMissingName}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.companies.addTitle}
        </h2>
        <form action={createCompanyAction} className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 space-y-1 sm:max-w-md">
            <span className="text-sm text-zinc-300">{ui.companies.nameRequired}</span>
            <input
              required
              name="name"
              placeholder={ui.companies.namePlaceholder}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {ui.companies.create}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.companies.listTitle}
        </h2>
        {companies?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">{ui.table.name}</th>
                  <th className="py-2">{ui.companies.clientsCol}</th>
                  <th className="py-2 text-right">{ui.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {companies.map((c: { id: string; name: string }) => (
                  <tr key={c.id}>
                    <td className="py-2">
                      <Link
                        href={`/companies/${c.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-2 text-zinc-400">
                      {clientCountByCompany.get(c.id) ?? 0}
                    </td>
                    <td className="py-2 text-right">
                      <form action={deleteCompanyAction} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          {ui.common.delete}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {ui.companies.empty}
          </p>
        )}
      </section>
    </div>
  );
}
