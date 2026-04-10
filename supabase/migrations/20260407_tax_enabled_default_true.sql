-- New companies and clients default to tax on; users can turn off per company/client.

alter table public.companies alter column tax_enabled set default true;
alter table public.clients alter column tax_enabled set default true;
