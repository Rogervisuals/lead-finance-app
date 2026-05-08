-- Optional footer blocks for invoice PDF (thank you + payment instructions).

alter table public.invoices
  add column if not exists thank_you_message text;

alter table public.invoices
  add column if not exists payment_information text;
