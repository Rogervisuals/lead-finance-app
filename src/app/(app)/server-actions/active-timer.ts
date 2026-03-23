"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

async function validateClientAndProject(
  supabase: ReturnType<typeof createSupabaseServerActionClient>,
  userId: string,
  client_id: string,
  project_id: string | null
) {
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!client) return false;

  if (!project_id) return true;

  const { data: project } = await supabase
    .from("projects")
    .select("id,client_id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .maybeSingle();

  return !!(project && project.client_id === client_id);
}

export async function startActiveTimerAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client_id = String(formData.get("client_id") ?? "").trim();
  const projectRaw = String(formData.get("project_id") ?? "").trim();
  const project_id = projectRaw || null;
  const notes = toNullableString(formData.get("notes"));

  const returnToRaw = String(formData.get("return_to") ?? "/dashboard").trim();
  const returnTo = returnToRaw || "/dashboard";

  if (!client_id) redirect(`${returnTo}?timer_error=missing_client`);

  const ok = await validateClientAndProject(supabase, user.id, client_id, project_id);
  if (!ok) redirect(`${returnTo}?timer_error=invalid_project`);

  const { data: existing } = await supabase
    .from("active_timer")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect(`${returnTo}?timer_error=already_running`);

  const { error } = await supabase.from("active_timer").insert({
    user_id: user.id,
    client_id,
    project_id,
    start_time: new Date().toISOString(),
    notes,
  });

  if (error) redirect(`${returnTo}?timer_error=save_failed`);

  redirect(returnTo);
}

export async function stopActiveTimerAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const returnToRaw = String(formData.get("return_to") ?? "/dashboard").trim();
  const returnTo = returnToRaw || "/dashboard";

  const { data: row } = await supabase
    .from("active_timer")
    .select("id,client_id,project_id,start_time,notes")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) redirect(returnTo);

  const end = new Date();
  const start = new Date(row.start_time);
  const diffMs = end.getTime() - start.getTime();
  const hours = roundTo2(diffMs / (1000 * 60 * 60));

  if (hours <= 0) {
    await supabase.from("active_timer").delete().eq("id", row.id).eq("user_id", user.id);
    redirect(`${returnTo}?timer_error=zero_duration`);
  }

  await supabase.from("hours").insert({
    user_id: user.id,
    client_id: row.client_id,
    project_id: row.project_id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    hours,
    notes: row.notes ?? null,
  });

  await supabase.from("active_timer").delete().eq("id", row.id).eq("user_id", user.id);

  redirect(returnTo);
}
