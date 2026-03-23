import type { User } from "@supabase/supabase-js";

/** Keys Supabase / OAuth may use for a human-readable name in `user_metadata`. */
const USER_METADATA_NAME_KEYS = [
  "display_name",
  "full_name",
  "name",
  "displayName",
  "preferred_username",
] as const;

/**
 * Returns the best display name from Auth `user_metadata` (signup / OAuth).
 * Does not use email — use {@link getNavbarDisplayLabel} for navbar fallback.
 */
export function getDisplayNameFromUserMetadata(
  user: User | null | undefined,
): string | null {
  const meta = user?.user_metadata;
  if (!meta || typeof meta !== "object") return null;
  const r = meta as Record<string, unknown>;
  for (const key of USER_METADATA_NAME_KEYS) {
    const v = r[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
  }
  return null;
}

/** Navbar: metadata display name, else pretty email local-part. */
export function getNavbarDisplayLabel(user: User | null | undefined): string {
  const fromMeta = getDisplayNameFromUserMetadata(user);
  if (fromMeta) return fromMeta;
  return getDisplayNameFromEmail(user?.email);
}

function getDisplayNameFromEmail(email?: string | null) {
  const raw = (email ?? "").trim();
  if (!raw) return "there";
  const namePart = raw.split("@")[0] || raw;
  const words = namePart
    .split(/[\s._-]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const joined = words.join(" ");
  return joined || namePart;
}
