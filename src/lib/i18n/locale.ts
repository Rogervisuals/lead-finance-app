export const LOCALE_COOKIE = "lf_locale";

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function parseLocale(raw: string | undefined | null): Locale {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "es") return "es";
  return "en";
}

export function getHtmlLang(locale: Locale): string {
  return locale === "es" ? "es" : "en";
}
