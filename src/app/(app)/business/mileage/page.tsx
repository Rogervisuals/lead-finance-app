import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODate } from "@/lib/finance/format";
import {
  createMileageAction,
  deleteMileageAction,
} from "../../server-actions/mileage";

export const dynamic = "force-dynamic";

function toIsoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 local (same week definition as many EU calendars). */
function startOfWeekMonday(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function sumDistanceKm(
  rows: Array<{ distance_km: number | string | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.distance_km ?? 0), 0);
}

export default async function MileagePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: projects }, { data: rows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,client_id")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("mileage")
      .select("id,date,distance_km,notes,project:projects(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const isoMonthStart = toIsoDateOnly(monthStart);
  const isoMonthEndExclusive = toIsoDateOnly(monthEndExclusive);

  const weekStart = startOfWeekMonday(now);
  const weekEndExclusive = new Date(weekStart);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 7);
  const isoWeekStart = toIsoDateOnly(weekStart);
  const isoWeekEndExclusive = toIsoDateOnly(weekEndExclusive);

  const list = (rows ?? []) as Array<{
    date: string;
    distance_km: number | string | null | undefined;
  }>;
  const totalAllKm = sumDistanceKm(list);
  const totalMonthKm = sumDistanceKm(
    list.filter(
      (r) => r.date >= isoMonthStart && r.date < isoMonthEndExclusive
    )
  );
  const totalWeekKm = sumDistanceKm(
    list.filter((r) => r.date >= isoWeekStart && r.date < isoWeekEndExclusive)
  );

  const fmtKm = (n: number) => n.toFixed(2);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mileage</h1>
        <p className="mt-1 text-sm text-zinc-400">Log distance traveled for projects.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-sky-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total (km)</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300 sm:text-3xl">
            {fmtKm(totalAllKm)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">All logged mileage</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">This month (km)</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300 sm:text-3xl">
            {fmtKm(totalMonthKm)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {now.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">This week (km)</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300 sm:text-3xl">
            {fmtKm(totalWeekKm)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Week of {formatISODate(isoWeekStart)} –{" "}
            {formatISODate(
              toIsoDateOnly(
                new Date(weekEndExclusive.getTime() - 24 * 60 * 60 * 1000)
              )
            )}
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Add mileage</h2>
        <form
          action={createMileageAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <label className="min-w-0 space-y-1">
            <span className="text-sm text-zinc-300">Project (optional)</span>
            <select
              name="project_id"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="">No project</option>
              {(projects ?? []).map((p: any) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Distance (km) *</span>
            <input
              required
              name="distance_km"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Notes</span>
            <input
              name="notes"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add mileage
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Existing mileage</h2>
        {rows?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Project</th>
                  <th className="py-2 pr-2 text-right">Distance (km)</th>
                  <th className="min-w-[10rem] py-2 pl-8">Notes</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(rows ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-2 text-zinc-300">{formatISODate(r.date)}</td>
                    <td className="py-2 text-zinc-200">
                      {r.project?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-sky-300">
                      {Number(r.distance_km ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 pl-8 text-zinc-400">{r.notes ?? "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/business/mileage/${r.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          Edit
                        </Link>
                        <form action={deleteMileageAction}>
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No mileage entries yet.
          </div>
        )}
      </section>
    </div>
  );
}

