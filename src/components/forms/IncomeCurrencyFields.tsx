"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/finance/format";
import {
  getCachedFxRate,
  setCachedFxRate,
} from "@/lib/finance/exchange-rate-cache";
import { fetchFxRate } from "@/lib/finance/exchange-rate";
import { formatFxLastUpdated } from "@/lib/finance/fx-last-updated-label";
import { roundMoney } from "@/lib/finance/income-currency";

/** Only EUR and USD are selectable for income amounts */
const CURRENCY_OPTIONS = ["EUR", "USD"] as const;

type Props = {
  baseCurrency: string;
  defaultCurrency?: string;
  defaultAmountOriginal?: number | string | null;
  /** Shown when currency ≠ base (how many units of base per 1 unit of entry currency) */
  defaultExchangeRate?: number | string | null;
};

export function IncomeCurrencyFields({
  baseCurrency,
  defaultCurrency = "EUR",
  defaultAmountOriginal,
  defaultExchangeRate,
}: Props) {
  const base = baseCurrency.trim().toUpperCase() || "EUR";

  const [currency, setCurrency] = useState(() => {
    const c = String(defaultCurrency ?? "EUR").trim().toUpperCase() || "EUR";
    return c === "EUR" || c === "USD" ? c : "EUR";
  });

  const [exchangeRate, setExchangeRate] = useState(() => {
    if (defaultExchangeRate != null && String(defaultExchangeRate).trim() !== "") {
      return String(defaultExchangeRate);
    }
    return "";
  });

  const [amountStr, setAmountStr] = useState(() =>
    defaultAmountOriginal != null && String(defaultAmountOriginal).trim() !== ""
      ? String(defaultAmountOriginal)
      : ""
  );

  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const exchangeRateRef = useRef(exchangeRate);

  useEffect(() => {
    exchangeRateRef.current = exchangeRate;
  }, [exchangeRate]);

  /** Re-render periodically so "Last updated X min ago" stays accurate. */
  const [, setLabelTick] = useState(0);
  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const id = window.setInterval(() => setLabelTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [lastUpdatedAt]);

  /** Prevent stale async responses from overwriting latest state. */
  const fetchSeqRef = useRef(0);

  const showRate = currency !== base;

  const convertedPreview = useMemo(() => {
    const amt = parseFloat(amountStr.replace(",", "."));
    const rate = parseFloat(exchangeRate.replace(",", "."));
    if (!showRate || !Number.isFinite(amt) || !Number.isFinite(rate) || rate <= 0) {
      return null;
    }
    return roundMoney(amt * rate);
  }, [amountStr, exchangeRate, showRate]);

  useEffect(() => {
    if (currency === base) {
      setExchangeRate("");
      setRateError(false);
      setRateLoading(false);
      setLastUpdatedAt(null);
      return;
    }

    let cancelled = false;
    const seq = ++fetchSeqRef.current;

    const cached = getCachedFxRate(currency, base);
    const reverseCached = getCachedFxRate(base, currency);
    const hasExistingRateValue = exchangeRateRef.current.trim() !== "";

    if (cached) {
      setExchangeRate(String(cached.rate));
      setRateError(false);
      setRateLoading(false);
      setLastUpdatedAt(cached.fetchedAt);
    } else if (reverseCached) {
      // Instant fallback from inverse pair (e.g. EUR|USD cached -> derive USD|EUR)
      const inverted = 1 / reverseCached.rate;
      if (Number.isFinite(inverted) && inverted > 0) {
        setExchangeRate(String(inverted));
        setRateError(false);
        setRateLoading(false);
        setLastUpdatedAt(reverseCached.fetchedAt);
      }
    } else {
      // Show spinner only if we truly have no usable value to show yet.
      setRateLoading(!hasExistingRateValue);
      setRateError(false);
      if (!hasExistingRateValue) {
        setLastUpdatedAt(null);
      }
    }

    void (async () => {
      const rate = await fetchFxRate(currency, base);
      if (cancelled || seq !== fetchSeqRef.current) return;

      setRateLoading(false);

      if (rate != null && rate > 0) {
        setCachedFxRate(currency, base, rate);
        setExchangeRate(String(rate));
        setLastUpdatedAt(Date.now());
        setRateError(false);
        return;
      }

      // Keep existing value visible on failures; only show error if nothing to fall back to.
      if (!cached && !reverseCached && !hasExistingRateValue) {
        setRateError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currency, base]);

  const lastUpdatedLabel =
    lastUpdatedAt != null && !rateError
      ? formatFxLastUpdated(lastUpdatedAt)
      : null;

  return (
    <>
      <label className="space-y-1">
        <span className="text-sm text-zinc-300">Amount *</span>
        <input
          required
          name="amount_original"
          type="number"
          step="0.01"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm text-zinc-300">Currency</span>
        <select
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.trim().toUpperCase())}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {showRate ? (
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-zinc-300">
            Exchange rate (1 {currency} = how many {base})
          </span>
          <input
            required={showRate}
            name="exchange_rate"
            type="number"
            step="any"
            min="0"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder={rateLoading ? "Loading…" : "e.g. 0.92"}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          {rateLoading ? (
            <span className="text-xs text-zinc-500">Fetching live rate…</span>
          ) : rateError ? (
            <span className="text-xs text-amber-400">
              Could not load a live rate. Enter the rate manually (1 {currency} = ?{" "}
              {base}).
            </span>
          ) : (
            <span className="text-xs text-zinc-500">
              Filled automatically from current market rates; you can adjust. Totals use{" "}
              {base}.
              {lastUpdatedLabel ? (
                <span className="block pt-0.5 text-zinc-600">{lastUpdatedLabel}</span>
              ) : null}
            </span>
          )}
          {convertedPreview != null ? (
            <div className="text-sm text-emerald-300/90">
              ≈ {formatCurrency(convertedPreview, base)} ({amountStr} {currency} at this
              rate)
            </div>
          ) : null}
        </label>
      ) : (
        <input type="hidden" name="exchange_rate" value="1" />
      )}
    </>
  );
}
