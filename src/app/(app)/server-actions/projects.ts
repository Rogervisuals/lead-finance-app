"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function toNullableNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createProjectAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client_id = String(formData.get("client_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const status = toNullableString(formData.get("status")) ?? "active";
  const start_date = toNullableString(formData.get("start_date"));
  const end_date = toNullableString(formData.get("end_date"));

  await supabase.from("projects").insert({
    user_id: user.id,
    client_id,
    name,
    status,
    start_date,
    end_date,
  });

  redirect("/projects");
}

export async function updateProjectAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const client_id = String(formData.get("client_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const status = toNullableString(formData.get("status")) ?? "active";
  const start_date = toNullableString(formData.get("start_date"));
  const end_date = toNullableString(formData.get("end_date"));

  await supabase
    .from("projects")
    .update({
      client_id,
      name,
      status,
      start_date,
      end_date,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/projects");
}

export async function deleteProjectAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/projects");
}

