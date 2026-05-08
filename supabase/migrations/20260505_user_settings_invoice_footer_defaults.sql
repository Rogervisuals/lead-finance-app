-- Defaults for invoice thank-you + payment blocks (Create invoice pre-fill).

alter table public.user_settings
  add column if not exists default_invoice_thank_you_message text;

alter table public.user_settings
  add column if not exists default_invoice_payment_information text;
