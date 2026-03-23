"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function parseDateTimeLocal(value: string) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
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

export async function createHourAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const client_id = String(formData.get("client_id") ?? "").trim();
  const projectRaw = String(formData.get("project_id") ?? "").trim();
  const project_id = projectRaw || null;
  const startRaw = String(formData.get("start_time") ?? "").trim();
  const endRaw = String(formData.get("end_time") ?? "").trim();
  const notes = toNullableString(formData.get("notes"));

  if (!client_id || !startRaw || !endRaw) {
    redirect("/hours/add?error=Missing+required+fields");
  }

  const ok = await validateClientAndProject(supabase, user.id, client_id, project_id);
  if (!ok) {
    redirect("/hours/add?error=Invalid+client+or+project");
  }

  const start = parseDateTimeLocal(startRaw);
  const end = parseDateTimeLocal(endRaw);

  if (!start || !end) {
    redirect("/hours/add?error=Invalid+date+range");
  }

  const diffMs = end.getTime() - start.getTime();
  const hours = roundTo2(diffMs / (1000 * 60 * 60));

  if (!(hours > 0)) {
    redirect("/hours/add?error=End+must+be+after+start");
  }

  const row = {
    user_id: user.id,
    client_id,
    project_id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    hours,
    notes,
  };

  const { error } = await supabase.from("hours").insert(row);

  if (error) {
    // Older DBs: hours row has project_id only (no client_id). Retry if a project was chosen.
    if (project_id) {
      const { error: err2 } = await supabase.from("hours").insert({
        user_id: user.id,
        project_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        hours,
        notes,
      });
      if (!err2) {
        redirect("/hours");
      }
    }

    const msg =
      error.message ||
      "Could not save hours. Run supabase/migrations/20260319_hours_client_optional_project.sql in the Supabase SQL Editor (hours need client_id; project is optional).";
    redirect(`/hours/add?error=${encodeURIComponent(msg)}`);
  }

  redirect("/hours");
}

export async function updateHourAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const client_id = String(formData.get("client_id") ?? "").trim();
  const projectRaw = String(formData.get("project_id") ?? "").trim();
  const project_id = projectRaw || null;
  const startRaw = String(formData.get("start_time") ?? "").trim();
  const endRaw = String(formData.get("end_time") ?? "").trim();
  const notes = toNullableString(formData.get("notes"));

  if (!id || !client_id || !startRaw || !endRaw) {
    redirect(`/hours/${id}/edit?error=Missing+required+fields`);
  }

  const ok = await validateClientAndProject(supabase, user.id, client_id, project_id);
  if (!ok) {
    redirect(`/hours/${id}/edit?error=Invalid+client+or+project`);
  }

  const start = parseDateTimeLocal(startRaw);
  const end = parseDateTimeLocal(endRaw);

  if (!start || !end) {
    redirect(`/hours/${id}/edit?error=Invalid+date+range`);
  }

  const diffMs = end.getTime() - start.getTime();
  const hours = roundTo2(diffMs / (1000 * 60 * 60));

  if (!(hours > 0)) {
    redirect(`/hours/${id}/edit?error=End+must+be+after+start`);
  }

  const { error } = await supabase
    .from("hours")
    .update({
      client_id,
      project_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      hours,
      notes,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/hours/${id}/edit?error=${encodeURIComponent(error.message ?? "Update failed")}`
    );
  }

  redirect("/hours");
}

export async function deleteHourAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/hours");

  await supabase.from("hours").delete().eq("id", id).eq("user_id", user.id);
  redirect("/hours");
}
