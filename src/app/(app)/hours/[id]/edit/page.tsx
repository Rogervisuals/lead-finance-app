import { DeleteLabel } from "@/components/icons/LabeledIcons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import {
  deleteHourAction,
  updateHourAction,
} from "../../../server-actions/hours";

export const dynamic = "force-dynamic";

function toDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default async function EditHoursPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: clients }, { data: projects }, { data: hour }] =
    await Promise.all([
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
        .from("hours")
        .select("id,client_id,project_id,start_time,end_time,notes")
        .eq("user_id", user.id)
        .eq("id", params.id)
        .single(),
    ]);

  if (!hour) redirect("/hours");

  const error = searchParams?.error
    ? decodeURIComponent(searchParams.error).replace(/\+/g, " ")
    : null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit hours</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <Link href="/hours" className="hover:underline">
            Back
          </Link>
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form
          action={updateHourAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <input type="hidden" name="id" value={hour.id} />

          <ClientProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            initialClientId={hour.client_id}
            initialProjectId={hour.project_id}
            clientLabel="Client *"
            projectLabel="Project (optional)"
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Start time *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                type="datetime-local"
                name="start_time"
                defaultValue={toDateTimeLocalValue(hour.start_time)}
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">End time *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                type="datetime-local"
                name="end_time"
                defaultValue={toDateTimeLocalValue(hour.end_time)}
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={hour.notes ?? ""}
              className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              disabled={!clients?.length}
            >
              Save changes
            </button>
          </div>
        </form>

      </section>
    </div>
  );
}
