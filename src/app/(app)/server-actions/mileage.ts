"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import {
  mileageStoredDistanceKm,
  normalizeMileageLocationKey,
} from "@/lib/mileage/distance";

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

type TripType = "one_way" | "round_trip";

function normalizeTripType(v: FormDataEntryValue | null): TripType {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "round_trip" ? "round_trip" : "one_way";
}

function normalizeLocationKey(v: FormDataEntryValue | null): string {
  return normalizeMileageLocationKey(String(v ?? ""));
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
  const trip_type = normalizeTripType(formData.get("trip_type"));
  const start_location = normalizeLocationKey(formData.get("start_location")) || "home";
  const end_location = normalizeLocationKey(formData.get("end_location")) || null;

  const inputDistance = toNullableNumber(formData.get("distance_km"));
  const notes = toNullableString(formData.get("notes"));

  if (!date || inputDistance == null) {
    redirect("/business/mileage?error=Missing+fields");
  }

  if (inputDistance < 0) {
    redirect("/business/mileage?error=Distance+must+be+0+or+greater");
  }

  const distance_km = mileageStoredDistanceKm(trip_type, inputDistance);

  await supabase.from("mileage").insert({
    user_id: user.id,
    project_id,
    date,
    distance_km,
    trip_type,
    start_location,
    end_location,
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
  const trip_type = normalizeTripType(formData.get("trip_type"));
  const start_location = normalizeLocationKey(formData.get("start_location")) || "home";
  const end_location = normalizeLocationKey(formData.get("end_location")) || null;

  const inputDistance = toNullableNumber(formData.get("distance_km"));
  const notes = toNullableString(formData.get("notes"));

  if (!id || !date || inputDistance == null) {
    redirect("/business/mileage");
  }

  if (inputDistance < 0) {
    redirect(`/business/mileage/${encodeURIComponent(id)}/edit?error=Distance+must+be+0+or+greater`);
  }

  const distance_km = mileageStoredDistanceKm(trip_type, inputDistance);

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
      trip_type,
      start_location,
      end_location,
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

export async function addMileageTemplateFromMileageAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mileageId = String(formData.get("mileage_id") ?? "").trim();
  if (!mileageId) redirect("/business/mileage");

  const { data: mileage } = await supabase
    .from("mileage")
    .select("project_id,trip_type,start_location,end_location,distance_km,notes")
    .eq("id", mileageId)
    .eq("user_id", user.id)
    .single();

  if (!mileage) redirect("/business/mileage");

  const dist = Number((mileage as any).distance_km ?? 0);
  const projectId = (mileage as any).project_id ?? null;
  const tripType = String((mileage as any).trip_type ?? "one_way");
  const startLoc = String((mileage as any).start_location ?? "home").trim() || "home";
  const endLocRaw = String((mileage as any).end_location ?? "").trim();
  const endLoc = endLocRaw ? endLocRaw : null;
  const notesNorm = String((mileage as any).notes ?? "").trim();

  const { data: candidates } = await supabase
    .from("mileage_templates")
    .select("id,trip_type,start_location,end_location,distance_km")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  /** Same identity as UI: trip + locations + final distance only (not project/notes). */
  const duplicate = (candidates ?? []).some((t: any) => {
    if (String(t.trip_type ?? "one_way") !== tripType) return false;
    if (String(t.start_location ?? "").trim() !== startLoc) return false;
    if (String(t.end_location ?? "").trim() !== String(endLoc ?? "").trim()) return false;
    return cents(t.distance_km) === cents(dist);
  });

  if (duplicate) redirect("/business/mileage?template_error=duplicate");

  await supabase.from("mileage_templates").insert({
    user_id: user.id,
    project_id: projectId,
    trip_type: tripType === "round_trip" ? "round_trip" : "one_way",
    start_location: startLoc,
    end_location: endLoc,
    distance_km: dist,
    notes: notesNorm || null,
    is_active: true,
  });

  redirect("/business/mileage");
}

export async function deleteMileageTemplateAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) redirect("/business/mileage");

  await supabase
    .from("mileage_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);

  redirect("/business/mileage");
}

