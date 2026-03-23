/** Round to 2 decimal places for money */
export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Convert an amount in the entry currency to base currency.
 * `exchangeRate` = how many units of base currency equal 1 unit of entry currency
 * (e.g. 1 USD = 0.92 EUR → rate 0.92 when base is EUR).
 */
export function convertToBase(
  amountOriginal: number,
  entryCurrency: string,
  baseCurrency: string,
  exchangeRate: number
) {
  const base = entryCurrency.trim().toUpperCase();
  const b = baseCurrency.trim().toUpperCase();
  if (base === b) {
    return {
      exchange_rate: 1,
      amount_converted: roundMoney(amountOriginal),
    };
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Invalid exchange rate");
  }
  return {
    exchange_rate: exchangeRate,
    amount_converted: roundMoney(amountOriginal * exchangeRate),
  };
}

/** Income entries: only EUR or USD (converted to your base currency for totals). */
export const INCOME_CURRENCY_OPTIONS = ["EUR", "USD"] as const;
