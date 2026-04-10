-- Invoice denomination: EUR or USD only (MVP).

alter table public.invoices
  add column if not exists currency text not null default 'EUR';

alter table public.invoices
  drop constraint if exists invoices_currency_check;

alter table public.invoices
  add constraint invoices_currency_check check (currency in ('EUR', 'USD'));
