/** Same rules as server-actions/mileage: form "distance" is one leg; round trip doubles into DB. */

export function normalizeMileageLocationKey(v: string | null | undefined): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const s = raw.toLowerCase().trim();
  if (s === "huis" || s === "home") return "home";
  return s
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function mileageStoredDistanceKm(
  tripType: "one_way" | "round_trip",
  legDistanceKm: number
): number {
  const n = Number(legDistanceKm);
  if (!Number.isFinite(n) || n < 0) return 0;
  const leg = Math.round(n * 100) / 100;
  const total = tripType === "round_trip" ? leg * 2 : leg;
  return Math.round(total * 100) / 100;
}
