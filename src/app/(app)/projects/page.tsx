import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createProjectAction,
  deleteProjectAction,
} from "../server-actions/projects";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import type { Locale } from "@/lib/i18n/locale";
import { canCreateProject, hasAccess } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

function formatDateOnly(v: string | null, locale: Locale, dash: string) {
  if (!v) return dash;
  const d = new Date(`${v}T00:00:00`);
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
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

function statusLabel(raw: string | null | undefined, ui: ReturnType<typeof getUi>) {
  const s = String(raw ?? "").toLowerCase();
  if (s === "active") return ui.projects.statusActive;
  if (s === "finished") return ui.projects.statusFinished;
  return raw?.trim() ? raw : ui.common.dash;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const locale = getServerLocale();
  const ui = getUi(locale);
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);

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

  const projectCount = (projects ?? []).length;
  const allowCreate = canCreateProject(plan, projectCount);
  const maxProjects = hasAccess(plan, "maxProjects");
  const maxLabel =
    typeof maxProjects === "number" && Number.isFinite(maxProjects)
      ? String(maxProjects)
      : "∞";
  const showLimitError =
    searchParams?.error === "project_limit" || searchParams?.error === "project_count";

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ui.projects.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {ui.projects.subtitle}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Plan: <span className="text-zinc-400">{plan}</span> — projects {projectCount} / {maxLabel}
        </p>
      </div>

      {showLimitError ? (
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {searchParams?.error === "project_count"
            ? "Could not verify your project count. Try again."
            : "You have reached the project limit for your plan. Delete a project or upgrade to add more."}
        </div>
      ) : null}

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.projects.createTitle}
        </h2>
        {!allowCreate ? (
          <p className="text-sm text-zinc-500">
            Project limit reached for your current plan ({projectCount} / {maxLabel}). Remove a project
            or upgrade to create more.
          </p>
        ) : (
        <form
          action={createProjectAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">{ui.projects.clientRequired}</span>
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
            <span className="text-sm text-zinc-300">{ui.projects.projectName}</span>
            <input
              required
              name="name"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">{ui.projects.status}</span>
            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="active">{ui.projects.statusActive}</option>
              <option value="finished">{ui.projects.statusFinished}</option>
            </select>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">{ui.projects.startDate}</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                name="start_date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">{ui.projects.endDate}</span>
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
              {ui.projects.addProject}
            </button>
            {!clients?.length ? (
              <p className="mt-2 text-xs text-zinc-500">
                {ui.projects.needClientFirst}
              </p>
            ) : null}
          </div>
        </form>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          {ui.projects.existingTitle}
        </h2>
        {sortedProjects.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">{ui.projects.tableProject}</th>
                  <th className="py-2">{ui.projects.tableClient}</th>
                  <th className="py-2">{ui.projects.tableStatus}</th>
                  <th className="py-2">{ui.projects.tableDates}</th>
                  <th className="py-2 text-right">{ui.table.actions}</th>
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
                      {statusLabel(p.status, ui)}
                    </td>
                    <td className="py-2 text-zinc-400">
                      {formatDateOnly(p.start_date, locale, ui.common.dash)} →{" "}
                      {formatDateOnly(p.end_date, locale, ui.common.dash)}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/projects/${p.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          {ui.common.edit}
                        </Link>
                        <form action={deleteProjectAction}>
                          <input type="hidden" name="id" value={p.id} />
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
            {ui.projects.noProjects}
          </div>
        )}
      </section>
    </div>
  );
}

