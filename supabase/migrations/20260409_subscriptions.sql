-- Subscription plans (Stripe-ready: single row per user, updated by webhooks or admin).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  status text not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'basic', 'pro'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('active', 'cancelled'));

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (user_id = auth.uid());

-- Updates/deletes are reserved for service role (e.g. Stripe webhooks) or SQL console.
