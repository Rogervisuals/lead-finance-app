-- Client postal code and city (for invoices) - additive change.

alter table public.clients
  add column if not exists postal_code text;

alter table public.clients
  add column if not exists city text;
