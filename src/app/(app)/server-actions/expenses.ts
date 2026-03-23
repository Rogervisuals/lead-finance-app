"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerActionClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

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

async function normalizeProjectForClient({
  supabase,
  userId,
  project_id,
  client_id,
}: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  userId: string;
  project_id: string | null;
  client_id: string;
}) {
  if (!project_id) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id,client_id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();

  if (!project) return null;
  if (project.client_id !== client_id) return null;
  return project_id;
}

export async function createExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client_id = String(formData.get("client_id") ?? "").trim();
  let project_id = toNullableString(formData.get("project_id"));
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id,
  });

  const date = String(formData.get("date") ?? "").trim();
  const amount = toNullableNumber(formData.get("amount")) ?? 0;
  const currency = String(formData.get("currency") ?? "EUR").trim() || "EUR";
  const category = toNullableString(formData.get("category")) ?? "General";
  const description = toNullableString(formData.get("description"));

  await supabase.from("expenses").insert({
    user_id: user.id,
    client_id,
    project_id,
    date,
    amount,
    currency,
    category,
    description,
  });

  redirect("/expenses");
}

export async function updateExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const client_id = String(formData.get("client_id") ?? "").trim();
  let project_id = toNullableString(formData.get("project_id"));
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id,
  });

  const date = String(formData.get("date") ?? "").trim();
  const amount = toNullableNumber(formData.get("amount")) ?? 0;
  const currency = String(formData.get("currency") ?? "EUR").trim() || "EUR";
  const category = toNullableString(formData.get("category")) ?? "General";
  const description = toNullableString(formData.get("description"));

  await supabase
    .from("expenses")
    .update({
      client_id,
      project_id,
      date,
      amount,
      currency,
      category,
      description,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/expenses");
}

export async function deleteExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  redirect("/expenses");
}

