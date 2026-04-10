-- Company tax uses user_settings.tax_percentage; companies only store whether tax applies.

alter table public.companies drop column if exists tax_number;
alter table public.companies drop column if exists tax_percentage;
