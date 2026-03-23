/**
 * Live spot rate: 1 unit of `from` = X units of `to` (e.g. 1 USD = 0.92 EUR).
 * Uses Frankfurter (ECB-based), no API key.
 */
export async function fetchFxRate(
  from: string,
  to: string
): Promise<number | null> {
  const f = from.trim().toUpperCase();
  const t = to.trim().toUpperCase();
  if (f === t) return 1;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[t];
    return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}
