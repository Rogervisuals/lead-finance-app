import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODate } from "@/lib/finance/format";
import { DeleteLabel, EditLabel } from "@/components/icons/LabeledIcons";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { ClientFilteredProjectSelect } from "@/components/forms/ClientFilteredProjectSelect";
import { MileageQuickTemplateButtons } from "@/components/business/MileageQuickTemplateButtons";
import {
  DASHBOARD_RANGE_MIN_YEAR,
  formatMonthYearLabel,
  formatYearLabel,
  resolveDashboardOrCustomRange,
  toISODateOnly,
} from "@/lib/dashboard-date-range";
import { getYearsWithActivityInRange } from "@/lib/dashboard-user-active-years";
import {
  createMileageAction,
  addMileageTemplateFromMileageAction,
  deleteMileageAction,
} from "../../server-actions/mileage";

export const dynamic = "force-dynamic";

function sumDistanceKm(
  rows: Array<{ distance_km: number | string | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.distance_km ?? 0), 0);
}

/** Monday 00:00 local (same week definition as many EU calendars). */
function startOfWeekMonday(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function locationLabel(key: string | null | undefined) {
  const k = String(key ?? "").trim().toLowerCase();
  if (!k) return "";
  if (k === "home") return "Huis";
  return k
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function mileageMatchesTemplateIdentity(
  row: {
    trip_type?: string | null;
    start_location?: string | null;
    end_location?: string | null;
    distance_km?: unknown;
  },
  t: {
    trip_type?: string | null;
    start_location?: string | null;
    end_location?: string | null;
    distance_km?: unknown;
  }
) {
  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  if (String(row.trip_type ?? "one_way") !== String(t.trip_type ?? "one_way")) return false;
  const rowStart = String(row.start_location ?? "home").trim() || "home";
  const tStart = String(t.start_location ?? "home").trim() || "home";
  if (rowStart !== tStart) return false;
  if (
    String(row.end_location ?? "").trim() !== String(t.end_location ?? "").trim()
  ) {
    return false;
  }
  return cents(row.distance_km) === cents(t.distance_km);
}

export default async function MileagePage({
  searchParams,
}: {
  searchParams?: { template_error?: string; range?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = getServerLocale();
  const ui = getUi(locale);

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const { kind, label, monthStart, monthEndExclusive } = resolveDashboardOrCustomRange({
    year,
    monthIndex0,
    range: searchParams?.range,
    from: null,
    to: null,
    locale,
    allTimeLabel: ui.dashboard.allTimeLabel,
  });
  const isoStart = monthStart ? toISODateOnly(monthStart) : null;
  const isoEndExclusive = monthEndExclusive ? toISODateOnly(monthEndExclusive) : null;

  const calendarMonthStart = new Date(year, monthIndex0, 1);
  const calendarMonthEndExclusive = new Date(year, monthIndex0 + 1, 1);
  const isoCalendarMonthStart = toISODateOnly(calendarMonthStart);
  const isoCalendarMonthEndExclusive = toISODateOnly(calendarMonthEndExclusive);

  const weekStart = startOfWeekMonday(now);
  const weekEndExclusive = new Date(weekStart);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 7);
  const isoWeekStart = toISODateOnly(weekStart);
  const isoWeekEndExclusive = toISODateOnly(weekEndExclusive);

  const mileageRowsQuery = (() => {
    let q = supabase
      .from("mileage")
      .select("id,date,distance_km,trip_type,start_location,end_location,notes,project:projects(name)")
      .eq("user_id", user.id);
    if (kind !== "all" && isoStart && isoEndExclusive) {
      q = q.gte("date", isoStart).lt("date", isoEndExclusive);
    }
    return q.order("date", { ascending: false });
  })();

  const [
    { data: clients },
    { data: projects },
    { data: templates },
    { data: rows },
    activeYears,
    { data: monthKmRows },
    { data: weekKmRows },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,client_id")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("mileage_templates")
      .select("id,project_id,trip_type,start_location,end_location,distance_km,notes,is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    mileageRowsQuery,
    getYearsWithActivityInRange(
      supabase,
      user.id,
      DASHBOARD_RANGE_MIN_YEAR,
      year,
      "mileage"
    ),
    supabase
      .from("mileage")
      .select("distance_km")
      .eq("user_id", user.id)
      .gte("date", isoCalendarMonthStart)
      .lt("date", isoCalendarMonthEndExclusive),
    supabase
      .from("mileage")
      .select("distance_km")
      .eq("user_id", user.id)
      .gte("date", isoWeekStart)
      .lt("date", isoWeekEndExclusive),
  ]);

  const candidateYears = Array.from(
    { length: Math.max(0, year - DASHBOARD_RANGE_MIN_YEAR + 1) },
    (_, i) => year - i
  );
  const rangeYearMatch = /^year-(\d{4})$/.exec(searchParams?.range ?? "");
  const selectedYear =
    rangeYearMatch != null ? Number(rangeYearMatch[1]) : null;

  let yearOptions = candidateYears
    .filter((y) => activeYears.has(y))
    .map((y) => ({
      value: `year-${y}`,
      label: formatYearLabel(y, locale),
    }));

  if (
    selectedYear != null &&
    selectedYear >= DASHBOARD_RANGE_MIN_YEAR &&
    selectedYear <= year &&
    !yearOptions.some((o) => o.value === `year-${selectedYear}`)
  ) {
    yearOptions = [
      {
        value: `year-${selectedYear}`,
        label: formatYearLabel(selectedYear, locale),
      },
      ...yearOptions,
    ];
  }

  const monthOptions = Array.from({ length: monthIndex0 + 1 }).map((_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      value: `month-${year}-${m}`,
      label: formatMonthYearLabel(year, i, locale),
    };
  });

  const list = (rows ?? []) as Array<{
    date: string;
    distance_km: number | string | null | undefined;
  }>;
  const totalPeriodKm = sumDistanceKm(list);
  const totalMonthKm = sumDistanceKm(monthKmRows ?? []);
  const totalWeekKm = sumDistanceKm(weekKmRows ?? []);

  const fmtKm = (n: number) => n.toFixed(2);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full text-center md:w-auto md:text-left">
          <h1 className="text-2xl font-semibold">Mileage</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Summary for <span className="text-zinc-200">{label}</span>
          </p>
        </div>
        <div className="flex w-full justify-center gap-2 md:w-auto md:justify-end">
          <form method="get" action="/business/mileage" className="flex gap-2">
            <select
              name="range"
              defaultValue={
                searchParams?.range ??
                `month-${year}-${String(monthIndex0 + 1).padStart(2, "0")}`
              }
              className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 outline-none"
            >
              <option value="all">{ui.dashboard.rangeAllTime}</option>
              {yearOptions.map((y) => (
                <option value={y.value} key={y.value}>
                  {y.label}
                </option>
              ))}
              {monthOptions.map((m) => (
                <option value={m.value} key={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
            >
              View
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-sky-900/40 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total (km)</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300 sm:text-3xl">
            {fmtKm(totalPeriodKm)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {kind === "all"
              ? "All recorded mileage."
              : `Mileage with a date in ${label}.`}{" "}
            Use View to change the range.
          </p>
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
              toISODateOnly(
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
          <ClientFilteredProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            clientLabel="Client (filter)"
            projectLabel="Project (optional)"
            allClientsLabel="All clients"
            noProjectLabel="No project"
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 [color-scheme:dark]">
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
              min={0}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="min-w-0 space-y-1">
            <span className="text-sm text-zinc-300">Trip type</span>
            <select
              name="trip_type"
              defaultValue="one_way"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="one_way">One way</option>
              <option value="round_trip">Round trip</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Start location</span>
            <input
              name="start_location"
              defaultValue="Huis"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">End location</span>
            <input
              name="end_location"
              placeholder="e.g. Sandro"
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
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Mileage templates
        </h2>
        {searchParams?.template_error === "duplicate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            This mileage entry is already saved as a template.
          </div>
        ) : null}
        {templates?.length ? (
          <MileageQuickTemplateButtons templates={(templates ?? []) as any} />
        ) : (
          <div className="text-sm text-zinc-500">
            No templates yet. Use "+" on a mileage row to save one.
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Clicking a template opens a prefilled form so you can adjust the date before saving.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Existing mileage</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Same period as total distance ({label}). Use View to change the range.
        </p>
        {rows?.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Project</th>
                  <th className="py-2 pr-2 text-right">Distance (km)</th>
                  <th className="min-w-0 py-2 pl-8 sm:min-w-[8rem]">Notes</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(rows ?? []).map((r: any) => {
                  const alreadyTemplate = (templates ?? []).some((t: any) =>
                    mileageMatchesTemplateIdentity(r, t)
                  );
                  return (
                  <tr key={r.id}>
                    <td className="py-2 text-zinc-300">{formatISODate(r.date)}</td>
                    <td className="py-2 text-zinc-200">
                      <div className="min-w-0">
                        <div className="truncate">{r.project?.name ?? "—"}</div>
                        {r.start_location || r.end_location ? (
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {locationLabel(r.start_location || "home")}
                            {r.end_location ? ` → ${locationLabel(r.end_location)}` : ""}
                            {String(r.trip_type ?? "one_way") === "round_trip"
                              ? " (Round Trip)"
                              : ""}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-sky-300">
                      {Number(r.distance_km ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 pl-8 text-zinc-400">{r.notes ?? "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={addMileageTemplateFromMileageAction}>
                          <input type="hidden" name="mileage_id" value={r.id} />
                          <button
                            type="submit"
                            disabled={alreadyTemplate}
                            title={
                              alreadyTemplate
                                ? "Already saved as a template"
                                : "Save as quick template"
                            }
                            className="shrink-0 whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-950/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-950/20"
                          >
                            +
                          </button>
                        </form>
                        <Link
                          href={`/business/mileage/${r.id}/edit`}
                          className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                        >
                          <EditLabel>{ui.common.edit}</EditLabel>
                        </Link>
                        <form action={deleteMileageAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40"
                          >
                            <DeleteLabel>{ui.common.delete}</DeleteLabel>
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
            {kind === "all"
              ? "No mileage entries yet."
              : "No mileage entries in this period."}
          </div>
        )}
      </section>
    </div>
  );
}

