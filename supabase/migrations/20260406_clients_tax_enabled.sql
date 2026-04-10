alter table public.clients add column if not exists tax_enabled boolean not null default true;
