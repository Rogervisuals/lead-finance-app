"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export async function createClientAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const companyLegacy = String(formData.get("company") ?? "").trim() || null;
  const companyIdRaw = String(formData.get("company_id") ?? "").trim();
  const company_id = companyIdRaw || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Omit `company_id` when unset so DBs without the migration column still accept inserts.
  await supabase.from("clients").insert({
    user_id: user.id,
    name,
    email,
    company: companyLegacy,
    notes,
    ...(company_id ? { company_id } : {}),
  });

  redirect("/clients");
}

export async function updateClientAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const companyLegacy = String(formData.get("company") ?? "").trim() || null;
  const companyIdRaw = String(formData.get("company_id") ?? "").trim();
  const company_id = companyIdRaw || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const base = {
    name,
    email,
    company: companyLegacy,
    notes,
  };
  const withCompany = {
    ...base,
    company_id: company_id as string | null,
  };

  let res = await supabase
    .from("clients")
    .update(withCompany)
    .eq("id", id)
    .eq("user_id", user.id);

  if (res.error && String(res.error.message).toLowerCase().includes("company_id")) {
    await supabase.from("clients").update(base).eq("id", id).eq("user_id", user.id);
  }

  redirect("/clients");
}

export async function deleteClientAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  await supabase.from("clients").delete().eq("id", id).eq("user_id", user.id);

  redirect("/clients");
}

