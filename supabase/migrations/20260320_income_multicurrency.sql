-- Multi-currency: base currency in user_settings; income stores original + converted.

alter table public.user_settings
  add column if not exists base_currency varchar(8) not null default 'EUR';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'income'
      and column_name = 'amount'
  ) then
    alter table public.income add column if not exists amount_original numeric(12,2);
    alter table public.income add column if not exists amount_converted numeric(12,2);
    alter table public.income add column if not exists exchange_rate numeric(18,8);

    update public.income
    set
      amount_original = coalesce(amount, 0),
      amount_converted = coalesce(amount, 0),
      exchange_rate = 1
    where true;

    alter table public.income alter column amount_original set not null;
    alter table public.income alter column amount_converted set not null;
    alter table public.income alter column exchange_rate set not null;

    alter table public.income drop column amount;

    alter table public.income
      alter column currency type varchar(8) using trim(currency::text);
  end if;
end $$;

-- Ensure new columns exist when upgrading from partial state (no legacy `amount`).
alter table public.income add column if not exists amount_original numeric(12,2);
alter table public.income add column if not exists amount_converted numeric(12,2);
alter table public.income add column if not exists exchange_rate numeric(18,8);
