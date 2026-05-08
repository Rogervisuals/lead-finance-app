-- Invoice PDF language: user selects per-invoice (ENG/ESP/NL).

alter table public.invoices
  add column if not exists invoice_locale text not null default 'en';

alter table public.invoices
  drop constraint if exists invoices_invoice_locale_check;

alter table public.invoices
  add constraint invoices_invoice_locale_check check (invoice_locale in ('en', 'es', 'nl'));

