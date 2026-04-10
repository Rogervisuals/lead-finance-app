/**
 * Verifies STRIPE_SECRET_KEY from .env.local against Stripe's API (outside Next.js).
 * Run: node scripts/verify-stripe-key.cjs
 *
 * If this fails with "Invalid API Key", the key is wrong/revoked in Stripe — fix in Dashboard, not in app code.
 */
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const line = raw.split("\n").find((l) => l.trim().startsWith("STRIPE_SECRET_KEY="));
if (!line) {
  console.error("No STRIPE_SECRET_KEY= line in .env.local");
  process.exit(1);
}

let rawValue = line.split("=").slice(1).join("=").trim();
rawValue = rawValue.replace(/\r/g, "");

function extractStripeSecretKey(raw) {
  const s = raw.replace(/^\uFEFF/, "").trim();
  const m = s.match(/sk_(test|live)_[A-Za-z0-9_]{20,300}/);
  return m ? m[0] : null;
}

let key = extractStripeSecretKey(rawValue);
if (!key) {
  key = rawValue;
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
}

if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
  console.error("Key must start with sk_test_ or sk_live_ (secret key, not pk_).");
  process.exit(1);
}

console.info("Calling Stripe API with key ending in …%s (length %s)", key.slice(-4), key.length);

const stripe = new Stripe(key);

stripe.balance
  .retrieve()
  .then(() => {
    console.log("OK — Stripe accepted this secret key. If Checkout still fails, check STRIPE_PRICE_ID is from the same account and Test mode.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAIL —", err.message);
    console.error("\nNext steps:");
    console.error("1. Stripe Dashboard → turn Test mode ON (top right).");
    console.error("2. Developers → API keys → Standard keys → Secret key → Reveal → copy full key.");
    console.error("3. If you just rolled the key, paste the NEW key only (old keys stop working immediately).");
    process.exit(1);
  });
