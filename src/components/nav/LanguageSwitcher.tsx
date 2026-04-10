"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { setLocaleAction } from "@/app/(app)/server-actions/locale";
import type { Locale } from "@/lib/i18n/locale";
import type { FullUi } from "@/lib/i18n/get-ui";

export function LanguageSwitcher({
  locale,
  nav,
}: {
  locale: Locale;
  nav: FullUi["nav"];
}) {
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setLocaleAction} className="flex items-center">
      <input type="hidden" name="return_to" value={pathname || "/dashboard"} />
      <label className="sr-only" htmlFor="lf-locale-select">
        {nav.language}
      </label>
      <select
        id="lf-locale-select"
        name="locale"
        defaultValue={locale}
        onChange={() => formRef.current?.requestSubmit()}
        className="max-w-[9.5rem] cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-xs text-zinc-200 outline-none transition-colors hover:border-zinc-700 focus:border-sky-500 sm:text-sm"
        aria-label={nav.language}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </form>
  );
}
