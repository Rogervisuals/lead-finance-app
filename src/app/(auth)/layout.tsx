import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getUi } from "@/lib/i18n/get-ui";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const locale = parseLocale(cookies().get(LOCALE_COOKIE)?.value);
  const ui = getUi(locale);

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full min-w-0 max-w-md flex-col px-4 pt-14 sm:pt-16">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher locale={locale} nav={ui.nav} />
      </div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}
