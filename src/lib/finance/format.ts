export function formatCurrency(
  amount: number,
  currency: string = "EUR"
) {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatISODate(isoDate: string) {
  // isoDate is expected to be `YYYY-MM-DD`.
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export function formatISODateTime(isoDateTime: string) {
  const d = new Date(isoDateTime);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Fixed locale so server + client render the same string (avoids hydration mismatch). */
export function formatFeedbackSubmittedAt(isoDateTime: string) {
  const d = new Date(isoDateTime);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function safeRate(totalIncome: number, totalHours: number) {
  if (!Number.isFinite(totalIncome) || !Number.isFinite(totalHours)) return null;
  if (totalHours <= 0) return null;
  return totalIncome / totalHours;
}

export function formatHourlyRate(rate: number | null, currency: string = "EUR") {
  if (rate == null) return "—";
  return `${formatCurrency(rate, currency)}/hr`;
}

export const DEFAULT_VAT_RATE = 0.21;

export function netFromGrossInclVat(grossInclVat: number, vatRate: number = DEFAULT_VAT_RATE) {
  if (!Number.isFinite(grossInclVat)) return 0;
  return grossInclVat / (1 + vatRate);
}

export function vatFromGrossInclVat(grossInclVat: number, vatRate: number = DEFAULT_VAT_RATE) {
  const net = netFromGrossInclVat(grossInclVat, vatRate);
  return grossInclVat - net;
}

