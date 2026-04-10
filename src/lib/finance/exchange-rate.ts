/** In-flight browser requests per pair — dedupes parallel mounts (e.g. many `FxSubline`s). */
const inFlightBrowser = new Map<string, Promise<number | null>>();

/**
 * Live spot rate: 1 unit of `from` = X units of `to` (e.g. 1 USD = 0.92 EUR).
 * Uses multiple public providers (no API key) and returns first valid response.
 *
 * In the browser, concurrent calls for the same pair share one network request.
 * Server / SSR calls are not deduped (no shared global request scope).
 */
export async function fetchFxRate(
  from: string,
  to: string
): Promise<number | null> {
  const f = from.trim().toUpperCase();
  const t = to.trim().toUpperCase();
  if (f === t) return 1;

  if (typeof window !== "undefined") {
    const key = `${f}|${t}`;
    let pending = inFlightBrowser.get(key);
    if (!pending) {
      pending = (async () => {
        const viaApi = await fetchFxRateViaApi(f, t);
        if (viaApi != null) return viaApi;
        return fetchFxRateFromProviders(f, t);
      })().finally(() => {
        inFlightBrowser.delete(key);
      });
      inFlightBrowser.set(key, pending);
    }
    return pending;
  }

  const viaApi = await fetchFxRateViaApi(f, t);
  if (viaApi != null) return viaApi;
  return fetchFxRateFromProviders(f, t);
}

export async function fetchFxRateFromProviders(
  from: string,
  to: string
): Promise<number | null> {
  const TIMEOUT_MS = 1800;

  const providers: Array<Promise<number | null>> = [
    fetchFrankfurterRate(from, to, TIMEOUT_MS),
    fetchExchangeRateHostRate(from, to, TIMEOUT_MS),
  ];

  const first = await firstValidRate(providers);
  if (first != null) return first;
  return null;
}

async function fetchFxRateViaApi(from: string, to: string): Promise<number | null> {
  const res = await fetchJsonWithTimeout<{ rate?: number }>(
    `/api/fx-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    1800
  );
  const rate = res?.rate;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function firstValidRate(tasks: Array<Promise<number | null>>): Promise<number | null> {
  const pending = [...tasks];
  while (pending.length) {
    const wrapped = pending.map((p, i) =>
      p.then((value) => ({ i, value })).catch(() => ({ i, value: null as number | null }))
    );
    const { i, value } = await Promise.race(wrapped);
    pending.splice(i, 1);
    if (value != null && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

async function fetchFrankfurterRate(
  from: string,
  to: string,
  timeoutMs: number
): Promise<number | null> {
  const res = await fetchJsonWithTimeout<{
    rates?: Record<string, number>;
  }>(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    timeoutMs
  );
  const rate = res?.rates?.[to];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchExchangeRateHostRate(
  from: string,
  to: string,
  timeoutMs: number
): Promise<number | null> {
  const res = await fetchJsonWithTimeout<{
    rates?: Record<string, number>;
  }>(
    `https://api.exchangerate.host/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`,
    timeoutMs
  );
  const rate = res?.rates?.[to];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
