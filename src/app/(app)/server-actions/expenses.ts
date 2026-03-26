"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerActionClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { parseCurrencyAmountFromForm } from "@/lib/finance/income-currency";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
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

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const parsed = parseCurrencyAmountFromForm(formData, settings.base_currency);
  if (!parsed) redirect("/expenses?error=exchange_rate");

  const client_id = String(formData.get("client_id") ?? "").trim();
  let project_id = toNullableString(formData.get("project_id"));
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id,
  });

  const date = String(formData.get("date") ?? "").trim();
  const category = toNullableString(formData.get("category")) ?? "General";
  const description = toNullableString(formData.get("description"));

  await supabase.from("expenses").insert({
    user_id: user.id,
    client_id,
    project_id,
    date,
    amount_original: parsed.amount_original,
    currency: parsed.currency,
    amount_converted: parsed.amount_converted,
    exchange_rate: parsed.exchange_rate,
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
  const settings = await getOrCreateUserFinancialSettings(user.id);
  const parsed = parseCurrencyAmountFromForm(formData, settings.base_currency);
  if (!parsed) {
    redirect(id ? `/expenses/${id}/edit?error=exchange_rate` : "/expenses?error=exchange_rate");
  }

  const client_id = String(formData.get("client_id") ?? "").trim();
  let project_id = toNullableString(formData.get("project_id"));
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id,
  });

  const date = String(formData.get("date") ?? "").trim();
  const category = toNullableString(formData.get("category")) ?? "General";
  const description = toNullableString(formData.get("description"));

  await supabase
    .from("expenses")
    .update({
      client_id,
      project_id,
      date,
      amount_original: parsed.amount_original,
      currency: parsed.currency,
      amount_converted: parsed.amount_converted,
      exchange_rate: parsed.exchange_rate,
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

