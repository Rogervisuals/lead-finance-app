import type { Locale } from "@/lib/i18n/locale";

/** BCP 47 tag for `Intl` and `Date.prototype.toLocaleString`. */
export function intlLocaleTag(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}
