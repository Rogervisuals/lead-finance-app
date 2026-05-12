import type { Locale } from "@/lib/i18n/locale";

/** BCP 47 tag for `Intl` and `Date.prototype.toLocaleString`. */
export function intlLocaleTag(locale: Locale): string {
  if (locale === "es") return "es-ES";
  if (locale === "nl") return "nl-NL";
  return "en-US";
}
