"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function toNullableNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function toNullableUuid(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

async function normalizeProjectForUser({
  supabase,
  userId,
  project_id,
}: {
  supabase: ReturnType<typeof createSupabaseServerActionClient>;
  userId: string;
  project_id: string | null;
}) {
  if (!project_id) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();

  if (!project) return null;
  return project_id;
}

export async function createMileageAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let project_id = toNullableUuid(formData.get("project_id"));
  project_id = await normalizeProjectForUser({
    supabase,
    userId: user.id,
    project_id,
  });
  const date = String(formData.get("date") ?? "").trim();
  const distance_km = toNullableNumber(formData.get("distance_km"));
  const notes = toNullableString(formData.get("notes"));

  if (!date || distance_km == null) {
    redirect("/business/mileage?error=Missing+fields");
  }

  await supabase.from("mileage").insert({
    user_id: user.id,
    project_id,
    date,
    distance_km,
    notes,
  });

  redirect("/business/mileage");
}

export async function updateMileageAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  let project_id = toNullableUuid(formData.get("project_id"));
  const date = String(formData.get("date") ?? "").trim();
  const distance_km = toNullableNumber(formData.get("distance_km"));
  const notes = toNullableString(formData.get("notes"));

  if (!id || !date || distance_km == null) {
    redirect("/business/mileage");
  }

  project_id = await normalizeProjectForUser({
    supabase,
    userId: user.id,
    project_id,
  });

  await supabase
    .from("mileage")
    .update({
      project_id,
      date,
      distance_km,
      notes,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/business/mileage");
}

export async function deleteMileageAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/business/mileage");

  await supabase
    .from("mileage")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/business/mileage");
}

