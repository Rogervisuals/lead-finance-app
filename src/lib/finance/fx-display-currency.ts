import { INCOME_CURRENCY_OPTIONS } from "@/lib/finance/income-currency";

export function getAllowedSecondary(primary: string) {
  const p = (primary || "EUR").trim().toUpperCase() || "EUR";
  return INCOME_CURRENCY_OPTIONS.filter((c) => c !== p);
}

/** Pick a valid secondary currency for display (never equals primary). */
export function normalizeSecondary(raw: string, primary: string) {
  const opts = getAllowedSecondary(primary);
  const s = raw.trim().toUpperCase();
  if (opts.includes(s as (typeof opts)[number])) return s;
  return opts[0] ?? "USD";
}
