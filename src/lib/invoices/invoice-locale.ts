export const INVOICE_LOCALES = ["en", "es", "nl"] as const;
export type InvoiceLocale = (typeof INVOICE_LOCALES)[number];

export function parseInvoiceLocale(raw: unknown): InvoiceLocale {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "es") return "es";
  if (s === "nl") return "nl";
  return "en";
}

