import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODateTime } from "@/lib/finance/format";
import { deleteHourAction } from "../server-actions/hours";

export const dynamic = "force-dynamic";

const LOG_PAGE_SIZE = 20;

function sumHours(rows: Array<{ hours: number | string | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
}

export default async function HoursPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

  const [{ count: logCount }, { data: monthRows }, { data: dayRows }] =
    await Promise.all([
      supabase
        .from("hours")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("hours")
        .select("hours,project_id,project:projects(name),client:clients(name)")
        .eq("user_id", user.id)
        .gte("start_time", monthStart.toISOString())
        .lt("start_time", monthEnd.toISOString()),
      supabase
        .from("hours")
        .select("hours")
        .eq("user_id", user.id)
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", dayEnd.toISOString()),
    ]);

  const pageRaw = Math.max(1, parseInt(String(searchParams?.page ?? "1"), 10) || 1);
  const totalLogEntries = logCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogEntries / LOG_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageRaw), totalPages);
  const from = (currentPage - 1) * LOG_PAGE_SIZE;
  const to = from + LOG_PAGE_SIZE - 1;

  const { data: hoursRows } = await supabase
    .from("hours")
    .select(
      "id,start_time,end_time,hours,notes,project_id,project:projects(name),client:clients(name)"
    )
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .range(from, to);

  const logPageUrl = (p: number) =>
    p <= 1 ? "/hours" : `/hours?page=${p}`;

  const totalMonthHours = sumHours((monthRows ?? []) as any);
  const totalDayHours = sumHours((dayRows ?? []) as any);

  const perProject = new Map<string, number>();
  for (const r of monthRows ?? []) {
    const project = (r as any).project;
    const client = (r as any).client;
    const projectName =
      (Array.isArray(project) ? project[0]?.name : project?.name) ?? null;
    const clientName =
      (Array.isArray(client) ? client[0]?.name : client?.name) ?? "—";
    const label = projectName
      ? projectName
      : `${clientName} (client only)`;
    perProject.set(label, (perProject.get(label) ?? 0) + Number((r as any).hours ?? 0));
  }
  const perProjectRows = Array.from(perProject.entries())
    .map(([projectName, totalHours]) => ({ projectName, totalHours }))
    .sort((a, b) => b.totalHours - a.totalHours);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hours</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Total hours (month) and (current day), plus your full log.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hours/add"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Add hours
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total hours (month)</div>
          <div className="mt-2 text-3xl font-semibold text-sky-300">
            {totalMonthHours.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total hours (current day)</div>
          <div className="mt-2 text-3xl font-semibold text-amber-300">
            {totalDayHours.toFixed(2)}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          All work logged by date/time
        </h2>
        {totalLogEntries > 0 ? (
          <>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[min(100%,720px)] text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2">Client / Project</th>
                    <th className="py-2 pr-2">Start</th>
                    <th className="py-2 pr-2">End</th>
                    <th className="w-24 whitespace-nowrap py-2 text-right">Hours</th>
                    <th className="min-w-0 py-2 pl-8 sm:min-w-[8rem]">
                      Notes
                    </th>
                    <th className="w-36 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(hoursRows ?? []).map((r: any) => {
                    const project = r.project ?? r.projects;
                    const client = r.client ?? r.clients;
                    const projectName =
                      (Array.isArray(project) ? project[0]?.name : project?.name) ??
                      null;
                    const clientName =
                      (Array.isArray(client) ? client[0]?.name : client?.name) ??
                      null;
                    const label =
                      projectName && clientName
                        ? `${clientName} / ${projectName}`
                        : projectName
                          ? projectName
                          : clientName
                            ? `${clientName} (client only)`
                            : "—";
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="py-2 text-zinc-200">
                          {label}
                        </td>
                        <td className="py-2 text-zinc-400">
                          {r.start_time ? formatISODateTime(r.start_time) : "—"}
                        </td>
                        <td className="py-2 text-zinc-400">
                          {r.end_time ? formatISODateTime(r.end_time) : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums text-zinc-200 whitespace-nowrap">
                          {r.hours == null ? "—" : Number(r.hours).toFixed(2)}
                        </td>
                        <td className="py-2 pl-8 text-zinc-400">
                          {r.notes ?? "—"}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/hours/${r.id}/edit`}
                              className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                            >
                              Edit
                            </Link>
                            <form action={deleteHourAction}>
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
            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <div className="text-xs text-zinc-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={logPageUrl(currentPage - 1)}
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
                      href={logPageUrl(currentPage + 1)}
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
            No hours logged yet.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Hours per project / client (month)
        </h2>
        {perProjectRows.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Project</th>
                  <th className="py-2 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {perProjectRows.map((r) => (
                  <tr key={r.projectName}>
                    <td className="py-2 text-zinc-200">{r.projectName}</td>
                    <td className="py-2 text-right text-zinc-200">
                      {r.totalHours.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No hours logged this month.
          </div>
        )}
      </section>
    </div>
  );
}

