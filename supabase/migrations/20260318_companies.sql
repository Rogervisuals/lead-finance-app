-- Incremental migration: companies + clients.company_id
-- Run in Supabase SQL Editor if you already applied an older schema.sql without this block.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
create index if not exists companies_user_id_idx on public.companies(user_id);

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  using (user_id = auth.uid());

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own"
  on public.companies for insert
  with check (user_id = auth.uid());

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own"
  on public.companies for delete
  using (user_id = auth.uid());

alter table public.clients
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists clients_company_id_idx on public.clients(company_id);
