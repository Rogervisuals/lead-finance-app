-- Extend existing public.user_settings with invoice business fields (MVP).
-- Does NOT change existing columns/logic.

alter table public.user_settings
  add column if not exists business_name text;
alter table public.user_settings
  add column if not exists full_name text;
alter table public.user_settings
  add column if not exists email text;
alter table public.user_settings
  add column if not exists phone text;
alter table public.user_settings
  add column if not exists website text;
alter table public.user_settings
  add column if not exists iban text;

alter table public.user_settings
  add column if not exists vat_number text;
alter table public.user_settings
  add column if not exists kvk_number text;
alter table public.user_settings
  add column if not exists address text;

alter table public.user_settings
  add column if not exists created_at timestamptz not null default now();

-- updated_at already exists; keep it as the single timestamp that is updated on save.

