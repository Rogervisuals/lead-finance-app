import { createSupabaseServerActionClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const DEFAULT_VAT_ENABLED = true;
export const DEFAULT_VAT_PERCENTAGE = 21;
export const DEFAULT_TAX_PERCENTAGE = 30;
export const DEFAULT_BASE_CURRENCY = "EUR";

export type UserFinancialSettings = {
  vat_enabled: boolean;
  vat_percentage: number;
  tax_percentage: number;
  base_currency: string;
};

function sanitizePercentage(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function sanitizeCurrencyCode(value: unknown, fallback: string) {
  const s = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (s.length >= 3 && s.length <= 8) return s.slice(0, 8);
  return fallback;
}

export async function getOrCreateUserFinancialSettings(
  userId: string
): Promise<UserFinancialSettings> {
  const supabase = createSupabaseServerClient();
  const defaults: UserFinancialSettings = {
    vat_enabled: DEFAULT_VAT_ENABLED,
    vat_percentage: DEFAULT_VAT_PERCENTAGE,
    tax_percentage: DEFAULT_TAX_PERCENTAGE,
    base_currency: DEFAULT_BASE_CURRENCY,
  };

  const { data: existing } = await supabase
    .from("user_settings")
    .select("vat_enabled,vat_percentage,tax_percentage,base_currency")
    .eq("user_id", userId)
    .maybeSingle();

  // Only create defaults when user has no row yet.
  if (!existing) {
    await supabase.from("user_settings").insert({
      user_id: userId,
      ...defaults,
      updated_at: new Date().toISOString(),
    });
  }

  const data = existing ?? defaults;

  return {
    vat_enabled: (data as any)?.vat_enabled ?? defaults.vat_enabled,
    vat_percentage: sanitizePercentage(
      (data as any)?.vat_percentage,
      defaults.vat_percentage
    ),
    tax_percentage: sanitizePercentage(
      (data as any)?.tax_percentage,
      defaults.tax_percentage
    ),
    base_currency: sanitizeCurrencyCode(
      (data as any)?.base_currency,
      defaults.base_currency
    ),
  };
}

export async function getVatEnabled(userId: string) {
  const settings = await getOrCreateUserFinancialSettings(userId);
  return settings.vat_enabled;
}

export async function setVatEnabled(userId: string, enabled: boolean) {
  const supabase = createSupabaseServerActionClient();
  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      vat_enabled: enabled,
      vat_percentage: DEFAULT_VAT_PERCENTAGE,
      tax_percentage: DEFAULT_TAX_PERCENTAGE,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function setUserFinancialSettings(
  userId: string,
  settings: UserFinancialSettings
) {
  const supabase = createSupabaseServerActionClient();
  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      vat_enabled: settings.vat_enabled,
      vat_percentage: sanitizePercentage(
        settings.vat_percentage,
        DEFAULT_VAT_PERCENTAGE
      ),
      tax_percentage: sanitizePercentage(
        settings.tax_percentage,
        DEFAULT_TAX_PERCENTAGE
      ),
      base_currency: sanitizeCurrencyCode(
        settings.base_currency,
        DEFAULT_BASE_CURRENCY
      ),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

