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

/** Entry currencies and dashboard base-currency options. */
export const INCOME_CURRENCY_OPTIONS = [
  "EUR",
  "USD",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
] as const;

function toNullableNumberFromForm(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse amount/currency/exchange_rate from forms using the same fields as income
 * (`amount_original`, `currency`, `exchange_rate`).
 */
export function parseCurrencyAmountFromForm(
  formData: FormData,
  baseCurrency: string
): {
  amount_original: number;
  currency: string;
  exchange_rate: number;
  amount_converted: number;
} | null {
  const amountOriginal = toNullableNumberFromForm(formData.get("amount_original")) ?? 0;
  const currency =
    String(formData.get("currency") ?? "EUR").trim().toUpperCase() || "EUR";
  const base = baseCurrency.trim().toUpperCase() || "EUR";
  const rateRaw = toNullableNumberFromForm(formData.get("exchange_rate"));

  if (currency !== base) {
    if (rateRaw == null || !Number.isFinite(rateRaw) || rateRaw <= 0) {
      return null;
    }
    const { exchange_rate, amount_converted } = convertToBase(
      amountOriginal,
      currency,
      base,
      rateRaw
    );
    return {
      amount_original: amountOriginal,
      currency,
      exchange_rate,
      amount_converted,
    };
  }

  const { exchange_rate, amount_converted } = convertToBase(
    amountOriginal,
    currency,
    base,
    1
  );
  return {
    amount_original: amountOriginal,
    currency,
    exchange_rate,
    amount_converted,
  };
}
