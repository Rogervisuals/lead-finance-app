import type { Locale } from "@/lib/i18n/locale";
import type { AppContent } from "@/messages/app-content";
import { appContentByLocale } from "@/messages/app-content";
import { uiByLocale, type UiCopy } from "@/messages/ui";

/** Core nav/footer + app strings; `auth` merges sign-out labels with login/signup copy. */
export type FullUi = Omit<UiCopy & AppContent, "auth"> & {
  auth: UiCopy["auth"] & AppContent["auth"];
};

export function getUi(locale: Locale): FullUi {
  const core = uiByLocale[locale] ?? uiByLocale.en;
  const app = appContentByLocale[locale] ?? appContentByLocale.en;
  const { auth: appAuth, ...restApp } = app;
  return {
    ...core,
    ...restApp,
    auth: {
      ...core.auth,
      ...appAuth,
    },
  };
}
