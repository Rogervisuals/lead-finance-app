"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FullUi } from "@/lib/i18n/get-ui";

const I18nContext = createContext<FullUi | null>(null);

export function I18nProvider({ value, children }: { value: FullUi; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): FullUi {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
