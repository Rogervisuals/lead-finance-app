"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import {
  getOrCreateUserFinancialSettings,
  setUserFinancialSettings,
  setVatEnabled,
} from "@/lib/user-settings";

export async function updateVatEnabledAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enabledRaw = String(formData.get("vat_enabled") ?? "true").trim();
  const returnTo = String(formData.get("return_to") ?? "/dashboard").trim();
  const enabled = enabledRaw === "true";

  await setVatEnabled(user.id, enabled);
  redirect(returnTo || "/dashboard");
}

export async function updateFinancialSettingsAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const vatEnabled = formData
    .getAll("vat_enabled")
    .map((v) => String(v).trim())
    .includes("true");
  const vatPercentage = Number(String(formData.get("vat_percentage") ?? "21").trim());
  const taxPercentage = Number(String(formData.get("tax_percentage") ?? "30").trim());
  const returnTo = String(formData.get("return_to") ?? "/dashboard/settings").trim();

  const current = await getOrCreateUserFinancialSettings(user.id);

  await setUserFinancialSettings(user.id, {
    vat_enabled: vatEnabled,
    vat_percentage: vatPercentage,
    tax_percentage: taxPercentage,
    base_currency: current.base_currency,
  });

  redirect(returnTo || "/dashboard/settings");
}

