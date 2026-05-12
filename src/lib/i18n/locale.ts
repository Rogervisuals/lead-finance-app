export const LOCALE_COOKIE = "lf_locale";

export const SUPPORTED_LOCALES = ["en", "es", "nl"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function parseLocale(raw: string | undefined | null): Locale {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "es") return "es";
  if (s === "nl") return "nl";
  return "en";
}

export function getHtmlLang(locale: Locale): string {
  if (locale === "es") return "es";
  if (locale === "nl") return "nl";
  return "en";
}
