-- Display-only quantity for invoice PDFs (amount_ex_vat remains line total; income unchanged).

alter table public.invoices
  add column if not exists quantity numeric(12,4) not null default 1;

alter table public.invoices
  drop constraint if exists invoices_quantity_positive;
alter table public.invoices
  add constraint invoices_quantity_positive check (quantity > 0);
