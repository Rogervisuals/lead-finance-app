"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function readBooleanCheckbox(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((x) => String(x).trim())
    .includes("true");
}

export async function updateCompanyTaxAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) redirect("/companies");

  const returnTo = String(formData.get("return_to") ?? `/companies/${companyId}`).trim();

  const taxEnabled = readBooleanCheckbox(formData, "tax_enabled");

  await supabase
    .from("companies")
    .update({
      tax_enabled: taxEnabled,
    })
    .eq("id", companyId)
    .eq("user_id", user.id);

  if (!taxEnabled) {
    await supabase
      .from("clients")
      .update({ tax_enabled: false })
      .eq("user_id", user.id)
      .eq("company_id", companyId);
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=1`);
}

export async function createCompanyAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/companies?error=missing_name");

  await supabase.from("companies").insert({
    user_id: user.id,
    name,
  });

  redirect("/companies");
}

export async function deleteCompanyAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/companies");

  await supabase.from("companies").delete().eq("id", id).eq("user_id", user.id);

  redirect("/companies");
}
