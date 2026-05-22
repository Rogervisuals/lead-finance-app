-- Frozen "≈" hint for income rows (comparison currency amount at save time).
alter table public.income add column if not exists approx_amount numeric(12, 2);
alter table public.income add column if not exists approx_currency text;
