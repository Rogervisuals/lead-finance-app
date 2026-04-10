-- Invoice line description; link income rows to invoices for dedupe/delete.

alter table public.invoices add column if not exists description text;

alter table public.income add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;

create index if not exists income_invoice_id_idx on public.income(invoice_id) where invoice_id is not null;

create unique index if not exists income_invoice_id_unique
  on public.income(invoice_id)
  where invoice_id is not null;
