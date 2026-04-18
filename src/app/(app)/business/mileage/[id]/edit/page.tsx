import { redirect } from "next/navigation";
import { DeleteLabel } from "@/components/icons/LabeledIcons";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientFilteredProjectSelect } from "@/components/forms/ClientFilteredProjectSelect";
import {
  deleteMileageAction,
  updateMileageAction,
} from "../../../../server-actions/mileage";
import { formatISODate } from "@/lib/finance/format";

export const dynamic = "force-dynamic";

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

export default async function EditMileagePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: mileage }, { data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from("mileage")
      .select("id,project_id,date,distance_km,trip_type,start_location,end_location,notes")
      .eq("user_id", user.id)
      .eq("id", params.id)
      .single(),
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
  ]);

  if (!mileage) redirect("/business/mileage");

  const initialProjectId = mileage.project_id ?? "";
  const initialClientId =
    initialProjectId && (projects ?? []).some((p: any) => p.id === initialProjectId)
      ? String((projects ?? []).find((p: any) => p.id === initialProjectId)?.client_id ?? "")
      : "";

  const tripType = String((mileage as any).trip_type ?? "one_way");
  const displayDistance =
    tripType === "round_trip"
      ? Number(mileage.distance_km ?? 0) / 2
      : Number(mileage.distance_km ?? 0);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit mileage</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <Link href="/business/mileage" className="hover:underline">
            Back
          </Link>{" "}
          • {formatISODate(mileage.date)}
        </p>
      </div>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form
          action={updateMileageAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <input type="hidden" name="id" value={mileage.id} />

          <ClientFilteredProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            clientLabel="Client (filter)"
            projectLabel="Project (optional)"
            allClientsLabel="All clients"
            noProjectLabel="No project"
            initialClientId={initialClientId || undefined}
            initialProjectId={initialProjectId || undefined}
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                defaultValue={mileage.date ?? ""}
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
              defaultValue={Number.isFinite(displayDistance) ? displayDistance : 0}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="min-w-0 space-y-1">
            <span className="text-sm text-zinc-300">Trip type</span>
            <select
              name="trip_type"
              defaultValue={tripType === "round_trip" ? "round_trip" : "one_way"}
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
              defaultValue={locationLabel((mileage as any).start_location ?? "home") || "Huis"}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">End location</span>
            <input
              name="end_location"
              defaultValue={locationLabel((mileage as any).end_location) || ""}
              placeholder="e.g. Sandro"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Notes</span>
            <input
              name="notes"
              defaultValue={mileage.notes ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save changes
            </button>
          </div>
        </form>

      </section>
    </div>
  );
}

