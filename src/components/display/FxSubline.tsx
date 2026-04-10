"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/finance/format";
import { fetchFxRate } from "@/lib/finance/exchange-rate";
import {
  getCachedFxRate,
  getValidCachedFxRate,
  setCachedFxRate,
} from "@/lib/finance/exchange-rate-cache";
import { roundMoney } from "@/lib/finance/income-currency";
import { normalizeSecondary } from "@/lib/finance/fx-display-currency";
import { useFinancialDisplayPrefs } from "@/components/layout/FinancialDisplayPrefsProvider";

const defaultLine = "text-xs tabular-nums text-zinc-500";

export function FxSubline({
  amount,
  currency,
  className = defaultLine,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const primary = (currency || "EUR").trim().toUpperCase() || "EUR";
  const { comparisonCurrency } = useFinancialDisplayPrefs();
  const effectiveSecondary = useMemo(
    () => normalizeSecondary(comparisonCurrency, primary),
    [comparisonCurrency, primary]
  );

  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const from = primary;
    const to = effectiveSecondary;
    if (from === to) {
      setRate(null);
      return;
    }

    const validDirect = getValidCachedFxRate(from, to);
    const validRev = getValidCachedFxRate(to, from);
    if (validDirect) {
      setRate(validDirect.rate);
      return () => {
        cancelled = true;
      };
    }
    if (validRev) {
      const inv = 1 / validRev.rate;
      if (Number.isFinite(inv) && inv > 0) {
        setRate(inv);
        return () => {
          cancelled = true;
        };
      }
    }

    const cached = getCachedFxRate(from, to);
    const reverseCached = getCachedFxRate(to, from);
    if (cached?.rate) {
      setRate(cached.rate);
    } else if (reverseCached?.rate) {
      const inv = 1 / reverseCached.rate;
      if (Number.isFinite(inv) && inv > 0) setRate(inv);
    } else {
      setRate(null);
    }

    void (async () => {
      const r = await fetchFxRate(from, to);
      if (cancelled) return;
      if (r != null && Number.isFinite(r) && r > 0) {
        setCachedFxRate(from, to, r);
        setRate(r);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [primary, effectiveSecondary]);

  if (primary === effectiveSecondary) return null;
  if (rate == null) return null;

  const converted = roundMoney(amount * rate);

  return (
    <div className={`${className} inline-flex flex-wrap items-center gap-x-1 gap-y-0.5`}>
      <span>
        ≈ {formatCurrency(converted, effectiveSecondary)}
      </span>
    </div>
  );
}
