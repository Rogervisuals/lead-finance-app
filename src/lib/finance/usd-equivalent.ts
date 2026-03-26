import { fetchFxRate } from "@/lib/finance/exchange-rate";

const inflight = new Map<string, Promise<number | null>>();

/** 1 unit of `fromCurrency` → how many USD (dedupes concurrent fetches per currency). */
export function getFxRateToUsd(fromCurrency: string): Promise<number | null> {
  const f = fromCurrency.trim().toUpperCase() || "EUR";
  if (f === "USD") return Promise.resolve(null);
  let p = inflight.get(f);
  if (!p) {
    p = (async () => {
      const rate = await fetchFxRate(f, "USD");
      if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
      return rate;
    })().finally(() => inflight.delete(f));
    inflight.set(f, p);
  }
  return p;
}
