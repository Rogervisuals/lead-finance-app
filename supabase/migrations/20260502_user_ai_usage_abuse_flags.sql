alter table public.user_ai_usage
  add column if not exists flagged boolean not null default false;

alter table public.user_ai_usage
  add column if not exists abuse_strike_count integer not null default 0;
