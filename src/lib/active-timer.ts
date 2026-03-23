import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveTimerRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  start_time: string;
  notes: string | null;
  projectName: string;
  clientName: string;
};

export async function getActiveTimerForUser(
  userId: string
): Promise<ActiveTimerRow | null> {
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("active_timer")
    .select("id,client_id,project_id,start_time,notes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", row.client_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!client) return null;

  let projectName = "—";
  if (row.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", row.project_id)
      .eq("user_id", userId)
      .maybeSingle();
    projectName = project?.name ?? "—";
  }

  return {
    id: row.id,
    client_id: row.client_id,
    project_id: row.project_id,
    start_time: row.start_time,
    notes: row.notes ?? null,
    projectName,
    clientName: client.name ?? "—",
  };
}
