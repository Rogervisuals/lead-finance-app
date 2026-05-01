import {
  CAPTCHA_THRESHOLD_IN_WINDOW,
  MAX_REQUESTS_PER_MINUTE_IP,
  MAX_REQUESTS_PER_MINUTE_USER,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/ai/assistant-limits";

/**
 * In-memory sliding-window rate limits (user id + IP).
 * Structure matches a future Redis layout: two maps of timestamp arrays.
 */
const rateLimitStore = {
  users: new Map<string, number[]>(),
  ips: new Map<string, number[]>(),
} as const;

function pruneTimestamps(timestamps: number[], now: number): number[] {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  return timestamps.filter((t) => t >= cutoff);
}

function getPrunedUserTimestamps(userId: string, now: number): number[] {
  const raw = rateLimitStore.users.get(userId) ?? [];
  const pruned = pruneTimestamps(raw, now);
  rateLimitStore.users.set(userId, pruned);
  return pruned;
}

function getPrunedIpTimestamps(ip: string, now: number): number[] {
  const raw = rateLimitStore.ips.get(ip) ?? [];
  const pruned = pruneTimestamps(raw, now);
  rateLimitStore.ips.set(ip, pruned);
  return pruned;
}

export type RateLimitCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: "user" | "ip";
      message: string;
    };

const MSG_USER = "You're sending requests too quickly. Please slow down.";
const MSG_IP = "Too many requests from this connection. Try again later.";

/**
 * Prunes old entries, then enforces per-user and per-IP ceilings for the last 60s.
 * Does not record the current request — call {@link updateRateLimits} after all other checks pass.
 */
export function checkRateLimits(userId: string, ip: string, now = Date.now()): RateLimitCheckResult {
  const userTs = getPrunedUserTimestamps(userId, now);
  const ipTs = getPrunedIpTimestamps(ip, now);

  if (userTs.length > MAX_REQUESTS_PER_MINUTE_USER) {
    return { ok: false, reason: "user", message: MSG_USER };
  }
  if (ipTs.length > MAX_REQUESTS_PER_MINUTE_IP) {
    return { ok: false, reason: "ip", message: MSG_IP };
  }

  return { ok: true };
}

/** After recording this request, true if the user has exceeded the CAPTCHA threshold in the window. */
export function getRequiresCaptchaAfterRequest(userId: string, now = Date.now()): boolean {
  const userTs = getPrunedUserTimestamps(userId, now);
  return userTs.length > CAPTCHA_THRESHOLD_IN_WINDOW;
}

/** Record one request in both sliding windows (call only after all pre-AI checks pass). */
export function updateRateLimits(userId: string, ip: string, now = Date.now()): void {
  const userTs = [...getPrunedUserTimestamps(userId, now), now];
  const ipTs = [...getPrunedIpTimestamps(ip, now), now];
  rateLimitStore.users.set(userId, userTs);
  rateLimitStore.ips.set(ip, ipTs);
}

/** @internal — tests or future Redis adapter */
export function __resetRateLimitStoreForTests(): void {
  rateLimitStore.users.clear();
  rateLimitStore.ips.clear();
}
