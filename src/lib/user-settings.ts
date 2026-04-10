import { createSupabaseServerActionClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { INCOME_CURRENCY_OPTIONS } from "@/lib/finance/income-currency";

export const DEFAULT_VAT_ENABLED = true;
export const DEFAULT_VAT_PERCENTAGE = 21;
export const DEFAULT_TAX_PERCENTAGE = 30;
export const DEFAULT_BASE_CURRENCY = "EUR";
export const DEFAULT_COMPARISON_CURRENCY = "USD";

export type UserFinancialSettings = {
  vat_enabled: boolean;
  vat_percentage: number;
  tax_percentage: number;
  base_currency: string;
  /** Shown as "≈" next to amounts (FX hint); stored globally, not per widget. */
  comparison_currency: string;
};

/** Business + invoice columns from `user_settings` for the settings page form. */
export type UserSettingsBusinessFields = {
  business_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  vat_number: string | null;
  kvk_number: string | null;
  address: string | null;
  invoice_logo_path: string | null;
};

const SETTINGS_PAGE_SELECT =
  "vat_enabled,vat_percentage,tax_percentage,base_currency,comparison_currency," +
  "business_name,full_name,email,phone,website,iban,vat_number,kvk_number,address,invoice_logo_path";

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

function sanitizeComparisonCurrency(value: unknown, fallback: string) {
  const s = sanitizeCurrencyCode(value, fallback);
  return (INCOME_CURRENCY_OPTIONS as readonly string[]).includes(s) ? s : fallback;
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
    comparison_currency: DEFAULT_COMPARISON_CURRENCY,
  };

  const { data: existing } = await supabase
    .from("user_settings")
    .select("vat_enabled,vat_percentage,tax_percentage,base_currency,comparison_currency")
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
    comparison_currency: sanitizeComparisonCurrency(
      (data as any)?.comparison_currency,
      defaults.comparison_currency
    ),
  };
}

/**
 * One read of `user_settings` (financial + business columns). Inserts the same default
 * row as `getOrCreateUserFinancialSettings` when missing. Used by the settings page only.
 */
export async function getOrCreateUserSettingsForSettingsPage(userId: string): Promise<{
  financialSettings: UserFinancialSettings;
  row: UserSettingsBusinessFields;
}> {
  const supabase = createSupabaseServerClient();
  const defaults: UserFinancialSettings = {
    vat_enabled: DEFAULT_VAT_ENABLED,
    vat_percentage: DEFAULT_VAT_PERCENTAGE,
    tax_percentage: DEFAULT_TAX_PERCENTAGE,
    base_currency: DEFAULT_BASE_CURRENCY,
    comparison_currency: DEFAULT_COMPARISON_CURRENCY,
  };

  const { data: existing } = await supabase
    .from("user_settings")
    .select(SETTINGS_PAGE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("user_settings").insert({
      user_id: userId,
      ...defaults,
      updated_at: new Date().toISOString(),
    });
    const financialSettings: UserFinancialSettings = {
      vat_enabled: defaults.vat_enabled,
      vat_percentage: defaults.vat_percentage,
      tax_percentage: defaults.tax_percentage,
      base_currency: defaults.base_currency,
      comparison_currency: defaults.comparison_currency,
    };
    const emptyRow: UserSettingsBusinessFields = {
      business_name: null,
      full_name: null,
      email: null,
      phone: null,
      website: null,
      iban: null,
      vat_number: null,
      kvk_number: null,
      address: null,
      invoice_logo_path: null,
    };
    return { financialSettings, row: emptyRow };
  }

  const financialSettings: UserFinancialSettings = {
    vat_enabled: (existing as any)?.vat_enabled ?? defaults.vat_enabled,
    vat_percentage: sanitizePercentage(
      (existing as any)?.vat_percentage,
      defaults.vat_percentage
    ),
    tax_percentage: sanitizePercentage(
      (existing as any)?.tax_percentage,
      defaults.tax_percentage
    ),
    base_currency: sanitizeCurrencyCode(
      (existing as any)?.base_currency,
      defaults.base_currency
    ),
    comparison_currency: sanitizeComparisonCurrency(
      (existing as any)?.comparison_currency,
      defaults.comparison_currency
    ),
  };

  const r = existing as unknown as Record<string, unknown>;
  const row: UserSettingsBusinessFields = {
    business_name: r.business_name != null ? String(r.business_name) : null,
    full_name: r.full_name != null ? String(r.full_name) : null,
    email: r.email != null ? String(r.email) : null,
    phone: r.phone != null ? String(r.phone) : null,
    website: r.website != null ? String(r.website) : null,
    iban: r.iban != null ? String(r.iban) : null,
    vat_number: r.vat_number != null ? String(r.vat_number) : null,
    kvk_number: r.kvk_number != null ? String(r.kvk_number) : null,
    address: r.address != null ? String(r.address) : null,
    invoice_logo_path:
      r.invoice_logo_path != null ? String(r.invoice_logo_path) : null,
  };

  return { financialSettings, row };
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
      comparison_currency: sanitizeComparisonCurrency(
        settings.comparison_currency,
        DEFAULT_COMPARISON_CURRENCY
      ),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

