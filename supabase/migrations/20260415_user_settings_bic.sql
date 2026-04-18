-- BIC / SWIFT for bank details on invoices (paired with IBAN).

alter table public.user_settings
  add column if not exists bic text;
