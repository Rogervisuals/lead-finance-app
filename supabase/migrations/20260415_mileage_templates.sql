-- Mileage templates (quick actions).

create table if not exists public.mileage_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  trip_type text not null default 'one_way',
  start_location text not null default 'home',
  end_location text,
  distance_km numeric(10,2) not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mileage_templates
  drop constraint if exists mileage_templates_trip_type_check;
alter table public.mileage_templates
  add constraint mileage_templates_trip_type_check
  check (trip_type in ('one_way', 'round_trip'));

alter table public.mileage_templates
  drop constraint if exists mileage_templates_distance_non_negative_check;
alter table public.mileage_templates
  add constraint mileage_templates_distance_non_negative_check
  check (distance_km >= 0);

alter table public.mileage_templates enable row level security;
create index if not exists mileage_templates_user_id_idx on public.mileage_templates(user_id);
create index if not exists mileage_templates_project_id_idx on public.mileage_templates(project_id);
create index if not exists mileage_templates_created_at_idx on public.mileage_templates(created_at desc);

drop policy if exists "mileage_templates_select_own" on public.mileage_templates;
create policy "mileage_templates_select_own"
  on public.mileage_templates for select
  using (user_id = auth.uid());

drop policy if exists "mileage_templates_insert_own" on public.mileage_templates;
create policy "mileage_templates_insert_own"
  on public.mileage_templates for insert
  with check (user_id = auth.uid());

drop policy if exists "mileage_templates_update_own" on public.mileage_templates;
create policy "mileage_templates_update_own"
  on public.mileage_templates for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "mileage_templates_delete_own" on public.mileage_templates;
create policy "mileage_templates_delete_own"
  on public.mileage_templates for delete
  using (user_id = auth.uid());

