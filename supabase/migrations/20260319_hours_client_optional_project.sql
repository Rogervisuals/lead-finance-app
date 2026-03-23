-- Hours: always tied to a client; project is optional.
-- Active timer: same.

alter table public.hours
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

update public.hours h
set client_id = p.client_id
from public.projects p
where h.project_id is not null
  and h.project_id = p.id
  and h.client_id is null;

delete from public.hours where client_id is null;

alter table public.hours alter column client_id set not null;

alter table public.hours alter column project_id drop not null;

create index if not exists hours_client_id_idx on public.hours(client_id);

-- Active timer
alter table public.active_timer
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

update public.active_timer t
set client_id = p.client_id
from public.projects p
where t.project_id is not null
  and t.project_id = p.id
  and t.client_id is null;

delete from public.active_timer where client_id is null;

alter table public.active_timer alter column client_id set not null;

alter table public.active_timer alter column project_id drop not null;

create index if not exists active_timer_client_id_idx on public.active_timer(client_id);
