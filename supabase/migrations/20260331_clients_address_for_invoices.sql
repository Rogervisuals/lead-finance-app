-- Client address (for invoices only) - additive change.

alter table public.clients
  add column if not exists address text;

create index if not exists clients_address_gin_idx
  on public.clients using gin (to_tsvector('simple', coalesce(address, '')));

