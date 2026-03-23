import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function sumHours(rows: Array<{ hours: number | string | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
}

export default async function HoursTotalsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);

  const { data: monthRows } = await supabase
    .from("hours")
    .select("hours,project:projects(name),client:clients(name)")
    .gte("start_time", monthStart.toISOString())
    .lt("start_time", monthEnd.toISOString())
    .order("start_time", { ascending: true });

  const totalMonthHours = sumHours((monthRows ?? []) as any);

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
    perProject.set(label, (perProject.get(label) ?? 0) + Number(r.hours ?? 0));
  }

  const perProjectRows = Array.from(perProject.entries())
    .map(([projectName, totalHours]) => ({ projectName, totalHours }))
    .sort((a, b) => b.totalHours - a.totalHours);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hours totals</h1>
          <p className="mt-1 text-sm text-zinc-400">
            For{" "}
            {now.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hours/add"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Add hours
          </Link>
          <Link
            href="/hours"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Back to list
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <div className="text-sm text-zinc-400">Total hours (month)</div>
        <div className="mt-2 text-3xl font-semibold text-sky-300">
          {totalMonthHours.toFixed(2)}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Hours per project / client
        </h2>
        {perProjectRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Project / client</th>
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

