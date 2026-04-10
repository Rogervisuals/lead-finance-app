alter table public.user_settings
  add column if not exists comparison_currency varchar(8) not null default 'USD';
