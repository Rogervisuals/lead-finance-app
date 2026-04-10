import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/i18n/locale";

/** Locale from cookie; use in server components and server actions. */
export function getServerLocale(): Locale {
  return parseLocale(cookies().get(LOCALE_COOKIE)?.value);
}
