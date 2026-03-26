/** Human-readable label for when a rate was last refreshed (cache or network). */
export function formatFxLastUpdated(fetchedAtMs: number, nowMs: number = Date.now()): string {
  const ageSec = Math.floor((nowMs - fetchedAtMs) / 1000);
  if (ageSec < 60) return "Updated just now";
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) {
    return ageMin === 1 ? "Last updated 1 min ago" : `Last updated ${ageMin} min ago`;
  }
  const ageH = Math.floor(ageMin / 60);
  if (ageH < 24) {
    return ageH === 1 ? "Last updated 1 h ago" : `Last updated ${ageH} h ago`;
  }
  const ageD = Math.floor(ageH / 24);
  return ageD === 1 ? "Last updated 1 day ago" : `Last updated ${ageD} days ago`;
}
