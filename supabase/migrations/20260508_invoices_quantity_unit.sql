-- Invoice line unit: quantity vs hours (for PDF column label).

alter table public.invoices
  add column if not exists quantity_unit text not null default 'qty';

alter table public.invoices
  drop constraint if exists invoices_quantity_unit_check;

alter table public.invoices
  add constraint invoices_quantity_unit_check check (quantity_unit in ('qty', 'hours'));

