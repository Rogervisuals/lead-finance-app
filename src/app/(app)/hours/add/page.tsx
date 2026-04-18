import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import { createHourAction } from "../../server-actions/hours";

export const dynamic = "force-dynamic";

export default async function AddHoursPage({
  searchParams,
}: {
  searchParams?: { error?: string; client?: string; project?: string };
}) {
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
      .select("id,name,client_id")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const error = searchParams?.error
    ? decodeURIComponent(searchParams.error).replace(/\+/g, " ")
    : null;

  const clientsList = (clients ?? []) as Array<{ id: string; name: string }>;
  const projectsList = (projects ?? []) as Array<{
    id: string;
    name: string;
    client_id: string;
  }>;

  const clientParam = String(searchParams?.client ?? "").trim();
  const projectParam = String(searchParams?.project ?? "").trim();

  const fromProject =
    projectParam && projectsList.some((p) => p.id === projectParam)
      ? projectsList.find((p) => p.id === projectParam)!
      : null;

  const initialClientId = fromProject
    ? fromProject.client_id
    : clientParam && clientsList.some((c) => c.id === clientParam)
      ? clientParam
      : undefined;

  const initialProjectId = fromProject ? fromProject.id : undefined;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add hours</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Hours are calculated automatically from start/end times. Client is
          required; project is optional.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form
          action={createHourAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <ClientProjectSelect
            clients={clientsList as any}
            projects={projectsList as any}
            clientLabel="Client *"
            projectLabel="Project (optional)"
            initialClientId={initialClientId}
            initialProjectId={initialProjectId}
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Start time *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 [color-scheme:dark]">
              <input
                required
                type="datetime-local"
                name="start_time"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">End time *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 [color-scheme:dark]">
              <input
                required
                type="datetime-local"
                name="end_time"
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="e.g. Design review, client call, dev work..."
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              disabled={!clients?.length}
            >
              Save hours
            </button>
            {!clients?.length ? (
              <p className="text-xs text-zinc-500">
                Create a client first to log hours.
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
