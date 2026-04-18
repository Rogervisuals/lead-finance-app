"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { INCOME_CURRENCY_OPTIONS } from "@/lib/finance/income-currency";
import { recomputeStoredAmountsForBaseCurrency } from "@/lib/finance/recompute-stored-amounts-for-base";
import {
  getOrCreateUserFinancialSettings,
  setUserFinancialSettings,
} from "@/lib/user-settings";

function toNullText(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function readBooleanCheckbox(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .includes("true");
}

function redirectWithQuery(path: string, key: string, value: string) {
  const base = path.trim() || "/settings";
  const sep = base.includes("?") ? "&" : "?";
  redirect(`${base}${sep}${key}=${encodeURIComponent(value)}`);
}

/**
 * Saves financial (VAT/tax) and business fields in one submit — same rules as the
 * separate actions, single redirect for the Settings page.
 */
export async function saveUnifiedSettingsAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const returnTo = String(formData.get("return_to") ?? "/settings").trim() || "/settings";
  const businessName = toNullText(formData.get("business_name"));
  if (!businessName) redirectWithQuery(returnTo, "error", "business_name");

  const vatEnabled = readBooleanCheckbox(formData, "vat_enabled");
  const vatPercentage = Number(String(formData.get("vat_percentage") ?? "21").trim());
  const taxPercentage = Number(String(formData.get("tax_percentage") ?? "30").trim());
  const current = await getOrCreateUserFinancialSettings(user.id);

  const allowed = new Set(INCOME_CURRENCY_OPTIONS as readonly string[]);
  const baseRaw = String(formData.get("base_currency") ?? current.base_currency)
    .trim()
    .toUpperCase();
  const base = allowed.has(baseRaw) ? baseRaw : current.base_currency;

  const compRaw = String(formData.get("comparison_currency") ?? current.comparison_currency)
    .trim()
    .toUpperCase();
  const comparison = allowed.has(compRaw) ? compRaw : current.comparison_currency;

  const baseChanged = base !== current.base_currency;

  await setUserFinancialSettings(user.id, {
    vat_enabled: vatEnabled,
    vat_percentage: vatPercentage,
    tax_percentage: taxPercentage,
    base_currency: base,
    comparison_currency: comparison,
  });

  if (baseChanged) {
    const ok = await recomputeStoredAmountsForBaseCurrency(supabase, user.id, base);
    if (!ok) {
      redirectWithQuery(returnTo, "error", "fx_rate");
    }
  }

  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      business_name: businessName,
      full_name: toNullText(formData.get("full_name")),
      email: toNullText(formData.get("email")),
      phone: toNullText(formData.get("phone")),
      website: toNullText(formData.get("website")),
      iban: toNullText(formData.get("iban")),
      bic: toNullText(formData.get("bic")),
      vat_number: toNullText(formData.get("vat_number")),
      kvk_number: toNullText(formData.get("kvk_number")),
      address: toNullText(formData.get("address")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  redirectWithQuery(returnTo, "saved", "1");
}

export async function saveBusinessSettingsAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const returnTo = String(formData.get("return_to") ?? "/settings").trim() || "/settings";
  const businessName = toNullText(formData.get("business_name"));
  if (!businessName) redirectWithQuery(returnTo, "error", "business_name");

  await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        business_name: businessName,
        full_name: toNullText(formData.get("full_name")),
        email: toNullText(formData.get("email")),
        phone: toNullText(formData.get("phone")),
        website: toNullText(formData.get("website")),
        iban: toNullText(formData.get("iban")),
        bic: toNullText(formData.get("bic")),
        vat_number: toNullText(formData.get("vat_number")),
        kvk_number: toNullText(formData.get("kvk_number")),
        address: toNullText(formData.get("address")),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  redirectWithQuery(returnTo, "saved", "1");
}

