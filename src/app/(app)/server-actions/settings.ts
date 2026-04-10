"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { INCOME_CURRENCY_OPTIONS } from "@/lib/finance/income-currency";
import { recomputeStoredAmountsForBaseCurrency } from "@/lib/finance/recompute-stored-amounts-for-base";
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
    comparison_currency: current.comparison_currency,
  });

  redirect(returnTo || "/dashboard/settings");
}

export async function updateBaseCurrencyAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const baseRaw = String(formData.get("base_currency") ?? "EUR")
    .trim()
    .toUpperCase();
  const allowed = new Set(INCOME_CURRENCY_OPTIONS as readonly string[]);
  const base = allowed.has(baseRaw) ? baseRaw : "EUR";
  const returnTo = String(formData.get("return_to") ?? "/dashboard").trim();

  const current = await getOrCreateUserFinancialSettings(user.id);
  await setUserFinancialSettings(user.id, {
    ...current,
    base_currency: base,
  });

  const ok = await recomputeStoredAmountsForBaseCurrency(supabase, user.id, base);

  const dest = returnTo || "/dashboard";
  if (!ok) {
    redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=fx_rate`);
  }

  redirect(dest);
}

