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

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function createBusinessExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = toNullableNumber(formData.get("amount"));
  const date = String(formData.get("date") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = toNullableString(formData.get("notes"));

  if (amount == null || !date || !category) redirect("/business/general-expenses?error=Missing+fields");

  await supabase.from("business_expenses").insert({
    user_id: user.id,
    amount,
    date,
    category,
    notes,
  });

  redirect("/business/general-expenses");
}

export async function updateBusinessExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const amount = toNullableNumber(formData.get("amount"));
  const date = String(formData.get("date") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = toNullableString(formData.get("notes"));

  if (!id || amount == null || !date || !category) redirect("/business/general-expenses");

  await supabase
    .from("business_expenses")
    .update({
      amount,
      date,
      category,
      notes,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/business/general-expenses");
}

export async function deleteBusinessExpenseAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/business/general-expenses");

  await supabase
    .from("business_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/business/general-expenses");
}

export async function addGeneralExpenseTemplateFromExpenseAction(
  formData: FormData
) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (!expenseId) redirect("/business/general-expenses");

  const { data: expense } = await supabase
    .from("business_expenses")
    .select("amount,category,notes")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .single();

  if (!expense) redirect("/business/general-expenses");

  const amt = Number(expense.amount ?? 0);
  const cat = String(expense.category ?? "");
  const notesNorm = (expense.notes ?? "").trim();

  // Duplicate = same amount + same notes (category can differ, e.g. null vs "General" in UI).
  const { data: candidates } = await supabase
    .from("general_expenses_templates")
    .select("id,notes")
    .eq("user_id", user.id)
    .eq("amount", amt);

  const duplicate = (candidates ?? []).some(
    (c) => ((c.notes ?? "").trim() === notesNorm)
  );
  if (duplicate) redirect("/business/general-expenses?template_error=duplicate");

  await supabase.from("general_expenses_templates").insert({
    user_id: user.id,
    amount: amt,
    category: cat,
    notes: expense.notes ?? null,
    is_active: true,
  });

  redirect("/business/general-expenses");
}

export async function deleteGeneralExpenseTemplateAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) redirect("/business/general-expenses");

  await supabase
    .from("general_expenses_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);

  redirect("/business/general-expenses");
}

export async function createGeneralExpenseFromTemplateAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) redirect("/business/general-expenses");

  const { data: template } = await supabase
    .from("general_expenses_templates")
    .select("amount,category,notes,is_active")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();

  if (!template?.is_active) redirect("/business/general-expenses");

  await supabase.from("business_expenses").insert({
    user_id: user.id,
    amount: Number(template.amount ?? 0),
    date: isoToday(),
    category: String(template.category ?? ""),
    notes: template.notes ?? null,
  });

  redirect("/business/general-expenses");
}

