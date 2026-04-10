-- Stripe "cancel at period end": subscription stays active until current_period_end.
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
  add column if not exists subscription_current_period_end timestamptz;
