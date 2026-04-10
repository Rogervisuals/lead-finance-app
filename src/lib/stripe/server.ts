import Stripe from "stripe";
import type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";
export type { PaidCheckoutPlan } from "@/lib/stripe/checkout-plans";

let stripe: Stripe | null = null;
/** Last key used to build `stripe` — must reset when env key changes (e.g. rotation). */
let stripeKeyUsed: string | null = null;

/**
 * Pull a valid Stripe secret from env text. Handles leading/trailing junk (quotes, smart
 * quotes, BOM) that break authentication if sent to the API.
 */
export function extractStripeSecretKey(raw: string): string | null {
  const s = raw.replace(/\r/g, "").replace(/^\uFEFF/, "").trim();
  const m = s.match(/sk_(test|live)_[A-Za-z0-9_]{20,300}/);
  return m ? m[0] : null;
}

/** Trim, strip quotes, remove CR (Windows CRLF in .env). Fallback when regex does not match. */
function normalizeStripeSecretKey(raw: string): string {
  let s = raw.replace(/\r/g, "").trim();
  // Strip ASCII and common “smart” quotes (Word/Docs paste)
  s = s
    .replace(/^[\s"'`«»\u201C\u201D\u201E]+|[\s"'`«»\u201C\u201D\u201E]+$/g, "")
    .trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getStripe(): Stripe {
  const raw = process.env.STRIPE_SECRET_KEY;
  if (!raw) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  const key =
    extractStripeSecretKey(raw) ??
    (() => {
      const n = normalizeStripeSecretKey(raw);
      return n.startsWith("sk_test_") || n.startsWith("sk_live_") ? n : "";
    })();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a valid Stripe secret (sk_test_… or sk_live_…). Remove extra quotes or spaces around the value."
    );
  }

  if (stripeKeyUsed !== key) {
    stripe = new Stripe(key);
    stripeKeyUsed = key;
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[stripe] Loaded STRIPE_SECRET_KEY ending in …%s (length %s)",
        key.slice(-4),
        String(key.length)
      );
    }
  }

  return stripe!;
}

/** Stripe Price id from env (handles quotes / stray text). */
export function extractStripePriceIdFromEnv(raw: string | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  const extracted = trimmed.match(/price_[A-Za-z0-9]+/)?.[0];
  const id =
    extracted ??
    trimmed
      .replace(/^[\s"'`«»\u201C\u201D\u201E]+|[\s"'`«»\u201C\u201D\u201E]+$/g, "")
      .trim();
  if (!id || !id.startsWith("price_")) return null;
  return id;
}

/** Basic / Pro subscription price ids from Stripe Dashboard. */
export function getStripePriceIdForPlan(plan: PaidCheckoutPlan): string {
  if (plan === "basic") {
    const id = extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID_BASIC);
    if (!id) {
      throw new Error(
        "Missing STRIPE_PRICE_ID_BASIC (Stripe Dashboard → Products → Basic price id)."
      );
    }
    return id;
  }
  const id =
    extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID_PRO) ??
    extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID);
  if (!id) {
    throw new Error(
      "Missing STRIPE_PRICE_ID_PRO or STRIPE_PRICE_ID (Pro price id)."
    );
  }
  return id;
}

/** Infer Basic vs Pro from a Stripe Price id (fallback when session metadata is missing). */
export function resolvePaidPlanFromStripePriceId(
  priceId: string | null | undefined
): PaidCheckoutPlan | null {
  if (!priceId) return null;
  const basic = extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID_BASIC);
  const pro =
    extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID_PRO) ??
    extractStripePriceIdFromEnv(process.env.STRIPE_PRICE_ID);
  if (basic && priceId === basic) return "basic";
  if (pro && priceId === pro) return "pro";
  return null;
}
