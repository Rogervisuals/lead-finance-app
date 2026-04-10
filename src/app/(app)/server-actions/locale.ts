"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "en").trim();
  const locale: Locale = parseLocale(raw);
  const returnTo = String(formData.get("return_to") ?? "/dashboard").trim() || "/dashboard";

  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  redirect(returnTo);
}
