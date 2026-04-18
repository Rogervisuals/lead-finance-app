-- Getting Started: base currency / VAT / tax complete after user saves financial settings once.
alter table public.user_settings
  add column if not exists financial_settings_saved_at timestamptz;

-- Existing accounts: treat as already confirmed so the checklist does not regress.
update public.user_settings
set financial_settings_saved_at = coalesce(updated_at, now())
where financial_settings_saved_at is null;
