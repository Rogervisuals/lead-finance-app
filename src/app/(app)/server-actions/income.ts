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

function toNullableNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
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

export async function createIncomeAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const parsed = parseCurrencyAmountFromForm(formData, settings.base_currency);
  if (!parsed) redirect("/income?error=exchange_rate");

  const client_id = String(formData.get("client_id") ?? "").trim();
  let project_id = toNullableString(formData.get("project_id"));
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id,
  });

  const date = String(formData.get("date") ?? "").trim();
  const description = toNullableString(formData.get("description"));

  await supabase.from("income").insert({
    user_id: user.id,
    client_id,
    project_id,
    date,
    amount_original: parsed.amount_original,
    currency: parsed.currency,
    amount_converted: parsed.amount_converted,
    exchange_rate: parsed.exchange_rate,
    description,
  });

  redirect("/income");
}

export async function updateIncomeAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const parsed = parseCurrencyAmountFromForm(formData, settings.base_currency);
  if (!parsed) redirect("/income?error=exchange_rate");

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
  const description = toNullableString(formData.get("description"));

  await supabase
    .from("income")
    .update({
      client_id,
      project_id,
      date,
      amount_original: parsed.amount_original,
      currency: parsed.currency,
      amount_converted: parsed.amount_converted,
      exchange_rate: parsed.exchange_rate,
      description,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/income");
}

export async function deleteIncomeAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  await supabase.from("income").delete().eq("id", id).eq("user_id", user.id);
  redirect("/income");
}

export async function addIncomeTemplateFromIncomeAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const incomeId = String(formData.get("income_id") ?? "").trim();
  if (!incomeId) redirect("/income");

  const { data: income } = await supabase
    .from("income")
    .select("client_id,project_id,amount_converted,description")
    .eq("id", incomeId)
    .eq("user_id", user.id)
    .single();

  if (!income?.client_id) redirect("/income");

  const amt = Number((income as { amount_converted?: unknown }).amount_converted ?? 0);
  const descNorm = (income.description ?? "").trim();
  const projIncome = income.project_id ?? null;

  const { data: candidates } = await supabase
    .from("income_templates")
    .select("id,project_id,description")
    .eq("user_id", user.id)
    .eq("client_id", income.client_id)
    .eq("amount", amt);

  const duplicate = (candidates ?? []).some((c) => {
    const projT = c.project_id ?? null;
    if (projT !== projIncome) return false;
    return (c.description ?? "").trim() === descNorm;
  });
  if (duplicate) redirect("/income?template_error=duplicate");

  await supabase.from("income_templates").insert({
    user_id: user.id,
    client_id: income.client_id,
    project_id: income.project_id ?? null,
    amount: amt,
    description: income.description ?? null,
    is_active: true,
  });

  redirect("/income");
}

export async function deleteIncomeTemplateAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) redirect("/income");

  await supabase
    .from("income_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);

  redirect("/income");
}

export async function createIncomeFromTemplateAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) redirect("/income");

  const { data: template } = await supabase
    .from("income_templates")
    .select("id,client_id,project_id,amount,description,is_active")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();

  if (!template?.is_active || !template.client_id) redirect("/income");

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const base = settings.base_currency.trim().toUpperCase() || "EUR";
  const net = Number(template.amount ?? 0);

  let project_id = template.project_id ? String(template.project_id) : null;
  project_id = await normalizeProjectForClient({
    supabase,
    userId: user.id,
    project_id,
    client_id: String(template.client_id),
  });

  await supabase.from("income").insert({
    user_id: user.id,
    client_id: template.client_id,
    project_id,
    date: isoToday(),
    amount_original: net,
    currency: base,
    amount_converted: net,
    exchange_rate: 1,
    description: template.description ?? null,
  });

  redirect("/income");
}
