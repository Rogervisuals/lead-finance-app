/**
 * Absolute origin for Stripe redirect URLs. Prefer the request Origin header (browser POST).
 */
export function getRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return site || null;
}
