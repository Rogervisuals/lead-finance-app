"use client";

import { useEffect } from "react";
import { fetchFxRate } from "@/lib/finance/exchange-rate";
import { setCachedFxRate } from "@/lib/finance/exchange-rate-cache";

const SESSION_KEY = "lead-finance.fx-prewarm.v1";

export function FxCachePrewarm() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    window.sessionStorage.setItem(SESSION_KEY, "1");

    const warm = async (from: string, to: string) => {
      const rate = await fetchFxRate(from, to);
      if (rate != null && rate > 0) {
        setCachedFxRate(from, to, rate);
      }
    };

    void Promise.allSettled([warm("EUR", "USD"), warm("USD", "EUR")]);
  }, []);

  return null;
}
