/**
 * Client-side FX cache (localStorage). Pair key: FROM|TO (e.g. USD|EUR for USD → EUR).
 */

export const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const STORAGE_KEY = "lead-finance.fx-cache.v1";

type PairEntry = { rate: number; fetchedAt: number };
type CacheStore = Record<string, PairEntry>;

function pairKey(from: string, to: string): string {
  const f = from.trim().toUpperCase();
  const t = to.trim().toUpperCase();
  return `${f}|${t}`;
}

function readStore(): CacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CacheStore;
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

/** Returns cached rate + timestamp if entry exists and is younger than TTL. */
export function getValidCachedFxRate(
  from: string,
  to: string
): { rate: number; fetchedAt: number } | null {
  const cached = getCachedFxRate(from, to);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > FX_CACHE_TTL_MS) return null;
  return cached;
}

/** Returns cached rate + timestamp if entry exists, regardless of age. */
export function getCachedFxRate(
  from: string,
  to: string
): { rate: number; fetchedAt: number } | null {
  const key = pairKey(from, to);
  const store = readStore();
  const entry = store[key];
  if (!entry || typeof entry.rate !== "number" || typeof entry.fetchedAt !== "number") {
    return null;
  }
  if (!Number.isFinite(entry.rate) || entry.rate <= 0) return null;
  return { rate: entry.rate, fetchedAt: entry.fetchedAt };
}

/** Persist rate and current time as fetch timestamp. */
export function setCachedFxRate(from: string, to: string, rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) return;
  const key = pairKey(from, to);
  const store = readStore();
  store[key] = { rate, fetchedAt: Date.now() };
  writeStore(store);
}
