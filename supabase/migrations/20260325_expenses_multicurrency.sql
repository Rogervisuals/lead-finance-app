-- Client expenses: store original amount + converted (base currency), like income.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'expenses'
      and column_name = 'amount'
  ) then
    alter table public.expenses add column if not exists amount_original numeric(12,2);
    alter table public.expenses add column if not exists amount_converted numeric(12,2);
    alter table public.expenses add column if not exists exchange_rate numeric(18,8);

    update public.expenses
    set
      amount_original = coalesce(amount, 0),
      amount_converted = coalesce(amount, 0),
      exchange_rate = 1
    where true;

    alter table public.expenses alter column amount_original set not null;
    alter table public.expenses alter column amount_converted set not null;
    alter table public.expenses alter column exchange_rate set not null;

    alter table public.expenses drop column amount;

    alter table public.expenses
      alter column currency type varchar(8) using trim(currency::text);
  end if;
end $$;

alter table public.expenses add column if not exists amount_original numeric(12,2);
alter table public.expenses add column if not exists amount_converted numeric(12,2);
alter table public.expenses add column if not exists exchange_rate numeric(18,8);
