-- Simple invoices MVP (no changes to existing tables)

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount_ex_vat numeric(12,2) not null,
  vat_enabled boolean not null default true,
  vat_percentage numeric(8,2) not null default 21,
  vat_amount numeric(12,2),
  total_amount numeric(12,2),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.invoices
  drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check check (status in ('open','paid'));

create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_created_at_idx on public.invoices(created_at desc);

alter table public.invoices enable row level security;

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
  on public.invoices for select
  using (
    (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = invoices.project_id and p.user_id = auth.uid()
    ))
    or
    (project_id is null and client_id is not null and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    ))
  );

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own"
  on public.invoices for insert
  with check (
    (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = invoices.project_id and p.user_id = auth.uid()
    ))
    or
    (project_id is null and client_id is not null and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    ))
  );

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own"
  on public.invoices for update
  using (
    (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = invoices.project_id and p.user_id = auth.uid()
    ))
    or
    (project_id is null and client_id is not null and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    ))
  )
  with check (
    (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = invoices.project_id and p.user_id = auth.uid()
    ))
    or
    (project_id is null and client_id is not null and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    ))
  );

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own"
  on public.invoices for delete
  using (
    (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = invoices.project_id and p.user_id = auth.uid()
    ))
    or
    (project_id is null and client_id is not null and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    ))
  );

