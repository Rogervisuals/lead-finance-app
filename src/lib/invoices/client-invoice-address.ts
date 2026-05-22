/** Client address fields used on invoice PDFs. */
export type ClientInvoiceAddressFields = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
};

export function clientHasInvoiceAddressDetails(
  fields: ClientInvoiceAddressFields
): boolean {
  const address = String(fields.address ?? "").trim();
  const postal = String(fields.postal_code ?? "").trim();
  const city = String(fields.city ?? "").trim();
  return Boolean(address || postal || city);
}

/** Single line: "1234 AB Amsterdam" (postal then city, space-separated). */
export function formatClientPostalCityLine(
  postal_code?: string | null,
  city?: string | null
): string | null {
  const postal = String(postal_code ?? "").trim();
  const cityName = String(city ?? "").trim();
  if (!postal && !cityName) return null;
  if (postal && cityName) return `${postal} ${cityName}`;
  return postal || cityName;
}
