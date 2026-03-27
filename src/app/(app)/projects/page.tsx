import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createProjectAction,
  deleteProjectAction,
} from "../server-actions/projects";

export const dynamic = "force-dynamic";

function formatDateOnly(v: string | null) {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function projectStatusClass(status: string | null | undefined) {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return "font-medium text-orange-400";
  if (s === "finished") return "font-medium text-emerald-400";
  return "text-zinc-400";
}

export default async function ProjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,client_id,name,status,start_date,end_date,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const sortedProjects = [...(projects ?? [])].sort((a: any, b: any) => {
    const af = String(a.status ?? "").toLowerCase() === "finished";
    const bf = String(b.status ?? "").toLowerCase() === "finished";
    if (af !== bf) return af ? 1 : -1;
    const ca = new Date(a.created_at).getTime();
    const cb = new Date(b.created_at).getTime();
    return cb - ca;
  });

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track the work you do for each client.
        </p>
      </div>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Create a project
        </h2>
        <form
          action={createProjectAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Client *</span>
            <select
              required
              name="client_id"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              {(clients ?? []).map((c: any) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Project name *</span>
            <input
              required
              name="name"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Status</span>
            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="active">Active</option>
              <option value="finished">Finished</option>
            </select>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Start date</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                name="start_date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">End date</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                name="end_date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
              disabled={!clients?.length}
            >
              Add project
            </button>
            {!clients?.length ? (
              <p className="mt-2 text-xs text-zinc-500">
                Create at least one client first.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Existing projects
        </h2>
        {sortedProjects.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Project</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Dates</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sortedProjects.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-zinc-400">
                      <Link
                        href={`/clients/${p.client_id}`}
                        className="hover:underline"
                      >
                        {clientById.get(p.client_id) ?? "—"}
                      </Link>
                    </td>
                    <td className={`py-2 ${projectStatusClass(p.status)}`}>
                      {p.status ?? "—"}
                    </td>
                    <td className="py-2 text-zinc-400">
                      {formatDateOnly(p.start_date)} → {formatDateOnly(p.end_date)}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/projects/${p.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          Edit
                        </Link>
                        <form action={deleteProjectAction}>
                          <input type="hidden" name="id" value={p.id} />
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
            No projects yet.
          </div>
        )}
      </section>
    </div>
  );
}

