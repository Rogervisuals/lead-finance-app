"use client";

import { createContext, useContext, type ReactNode } from "react";

const FinancialDisplayPrefsContext = createContext<{
  comparisonCurrency: string;
}>({ comparisonCurrency: "USD" });

export function useFinancialDisplayPrefs() {
  return useContext(FinancialDisplayPrefsContext);
}

export function FinancialDisplayPrefsProvider({
  comparisonCurrency,
  children,
}: {
  comparisonCurrency: string;
  children: ReactNode;
}) {
  return (
    <FinancialDisplayPrefsContext.Provider value={{ comparisonCurrency }}>
      {children}
    </FinancialDisplayPrefsContext.Provider>
  );
}
