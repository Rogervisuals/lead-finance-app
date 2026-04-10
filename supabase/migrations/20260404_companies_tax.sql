-- Replace mistaken company VAT columns with tax fields (toggle + optional id + rate).

alter table public.companies drop column if exists vat_enabled;
alter table public.companies drop column if exists vat_number;
alter table public.companies drop column if exists vat_percentage;

alter table public.companies add column if not exists tax_enabled boolean not null default true;
