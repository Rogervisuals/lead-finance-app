-- Optional Stripe linkage for Billing Portal (manage / cancel at period end).
alter table public.subscriptions
  add column if not exists stripe_customer_id text;

alter table public.subscriptions
  add column if not exists stripe_subscription_id text;
