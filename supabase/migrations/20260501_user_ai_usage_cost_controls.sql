-- Evolve AI usage tracking to support cost controls.
-- Keep legacy per-day rows for reference/history.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_ai_usage'
  ) then
    -- If legacy structure has (user_id,date) and requests_count, preserve it.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_ai_usage'
        and column_name = 'date'
    ) then
      alter table public.user_ai_usage rename to user_ai_usage_daily;
    end if;
  end if;
exception
  when others then
    -- If rename fails because it already happened, ignore.
    null;
end $$;

-- New per-user rolling usage table
create table if not exists public.user_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_requests integer not null default 0,
  monthly_requests integer not null default 0,
  daily_tokens integer not null default 0,
  monthly_tokens integer not null default 0,
  monthly_cost double precision not null default 0,
  last_request_at timestamptz,
  last_reset_daily timestamptz,
  last_reset_monthly timestamptz
);

create index if not exists user_ai_usage_user_id_idx on public.user_ai_usage (user_id);
create index if not exists user_ai_usage_last_request_at_idx on public.user_ai_usage (last_request_at);

alter table public.user_ai_usage enable row level security;

drop policy if exists "user_ai_usage_select_own" on public.user_ai_usage;
create policy "user_ai_usage_select_own"
  on public.user_ai_usage for select
  using (user_id = auth.uid());

drop policy if exists "user_ai_usage_insert_own" on public.user_ai_usage;
create policy "user_ai_usage_insert_own"
  on public.user_ai_usage for insert
  with check (user_id = auth.uid());

drop policy if exists "user_ai_usage_update_own" on public.user_ai_usage;
create policy "user_ai_usage_update_own"
  on public.user_ai_usage for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

