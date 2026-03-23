import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteProjectAction,
  updateProjectAction,
} from "../../../server-actions/projects";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,client_id,name,status,start_date,end_date")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  if (!project) redirect("/projects");

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit project</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update project details and link it to a client.
        </p>
      </div>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form
          action={updateProjectAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <input type="hidden" name="id" value={project.id} />

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Client *</span>
            <select
              required
              name="client_id"
              defaultValue={project.client_id ?? ""}
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
              defaultValue={project.name ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Status</span>
            <select
              name="status"
              defaultValue={project.status ?? "active"}
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
                defaultValue={project.start_date ?? ""}
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
                defaultValue={project.end_date ?? ""}
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
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

        <form action={deleteProjectAction} className="mt-4">
          <input type="hidden" name="id" value={project.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
          >
            Delete project
          </button>
        </form>
      </section>
    </div>
  );
}

