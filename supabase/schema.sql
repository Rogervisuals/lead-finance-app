-- Supabase schema for the Lead Finance Dashboard
-- Run this in the Supabase SQL editor for your project.

-- Enable UUID generation (gen_random_uuid()).
create extension if not exists pgcrypto;

-- =========================
-- User settings
-- =========================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vat_enabled boolean not null default true,
  vat_percentage numeric(6,2) not null default 21,
  tax_percentage numeric(6,2) not null default 30,
  base_currency varchar(8) not null default 'EUR',
  comparison_currency varchar(8) not null default 'USD',
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists vat_percentage numeric(6,2) not null default 21;
alter table public.user_settings
  add column if not exists tax_percentage numeric(6,2) not null default 30;
alter table public.user_settings
  add column if not exists base_currency varchar(8) not null default 'EUR';

alter table public.user_settings
  add column if not exists comparison_currency varchar(8) not null default 'USD';

alter table public.user_settings
  add column if not exists financial_settings_saved_at timestamptz;

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (user_id = auth.uid());

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (user_id = auth.uid());

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (user_id = auth.uid());

-- =========================
-- Clients
-- =========================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create index if not exists clients_user_id_idx on public.clients(user_id);

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  using (user_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  with check (user_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  using (user_id = auth.uid());

-- =========================
-- Companies (optional parent for clients)
-- =========================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tax_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
create index if not exists companies_user_id_idx on public.companies(user_id);

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  using (user_id = auth.uid());

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own"
  on public.companies for insert
  with check (user_id = auth.uid());

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own"
  on public.companies for delete
  using (user_id = auth.uid());

alter table public.clients
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.clients add column if not exists tax_enabled boolean not null default true;

create index if not exists clients_company_id_idx on public.clients(company_id);

-- =========================
-- Projects
-- =========================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table public.projects drop column if exists budget;

alter table public.projects enable row level security;
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_client_id_idx on public.projects(client_id);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects for select
  using (user_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  with check (user_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  using (user_id = auth.uid());

-- =========================
-- Income
-- =========================
create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  amount_original numeric(12,2) not null,
  currency varchar(8) not null default 'EUR',
  amount_converted numeric(12,2) not null,
  exchange_rate numeric(18,8) not null default 1,
  description text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.income add column if not exists notes text;
alter table public.income add column if not exists amount_original numeric(12,2);
alter table public.income add column if not exists amount_converted numeric(12,2);
alter table public.income add column if not exists exchange_rate numeric(18,8);

alter table public.income enable row level security;
create index if not exists income_user_id_idx on public.income(user_id);
create index if not exists income_date_idx on public.income(date);

drop policy if exists "income_select_own" on public.income;
create policy "income_select_own"
  on public.income for select
  using (user_id = auth.uid());

drop policy if exists "income_insert_own" on public.income;
create policy "income_insert_own"
  on public.income for insert
  with check (user_id = auth.uid());

drop policy if exists "income_update_own" on public.income;
create policy "income_update_own"
  on public.income for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "income_delete_own" on public.income;
create policy "income_delete_own"
  on public.income for delete
  using (user_id = auth.uid());

-- =========================
-- Income templates
-- =========================
create table if not exists public.income_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(12,2) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.income_templates enable row level security;
create index if not exists income_templates_user_id_idx
  on public.income_templates(user_id);
create index if not exists income_templates_client_id_idx
  on public.income_templates(client_id);
create index if not exists income_templates_is_active_idx
  on public.income_templates(is_active);

drop policy if exists "income_templates_select_own" on public.income_templates;
create policy "income_templates_select_own"
  on public.income_templates for select
  using (user_id = auth.uid());

drop policy if exists "income_templates_insert_own" on public.income_templates;
create policy "income_templates_insert_own"
  on public.income_templates for insert
  with check (user_id = auth.uid());

drop policy if exists "income_templates_update_own" on public.income_templates;
create policy "income_templates_update_own"
  on public.income_templates for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "income_templates_delete_own" on public.income_templates;
create policy "income_templates_delete_own"
  on public.income_templates for delete
  using (user_id = auth.uid());

-- =========================
-- Expenses
-- =========================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  amount_original numeric(12,2) not null,
  currency varchar(8) not null default 'EUR',
  amount_converted numeric(12,2) not null,
  exchange_rate numeric(18,8) not null default 1,
  category text not null default 'General',
  description text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists notes text;
alter table public.expenses add column if not exists amount_original numeric(12,2);
alter table public.expenses add column if not exists amount_converted numeric(12,2);
alter table public.expenses add column if not exists exchange_rate numeric(18,8);
alter table public.expenses drop column if exists vendor;

alter table public.expenses enable row level security;
create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_date_idx on public.expenses(date);

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
  on public.expenses for select
  using (user_id = auth.uid());

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
  on public.expenses for insert
  with check (user_id = auth.uid());

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
  on public.expenses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
  on public.expenses for delete
  using (user_id = auth.uid());

-- =========================
-- Hours
-- =========================
create table if not exists public.hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  hours numeric(8,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.hours add column if not exists notes text;

alter table public.hours enable row level security;
create index if not exists hours_user_id_idx on public.hours(user_id);
create index if not exists hours_client_id_idx on public.hours(client_id);
create index if not exists hours_project_id_idx on public.hours(project_id);

drop policy if exists "hours_select_own" on public.hours;
create policy "hours_select_own"
  on public.hours for select
  using (user_id = auth.uid());

drop policy if exists "hours_insert_own" on public.hours;
create policy "hours_insert_own"
  on public.hours for insert
  with check (user_id = auth.uid());

drop policy if exists "hours_update_own" on public.hours;
create policy "hours_update_own"
  on public.hours for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "hours_delete_own" on public.hours;
create policy "hours_delete_own"
  on public.hours for delete
  using (user_id = auth.uid());

-- =========================
-- Active timer (one row per user)
-- =========================
create table if not exists public.active_timer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  start_time timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists active_timer_user_id_unique
  on public.active_timer(user_id);

create index if not exists active_timer_client_id_idx
  on public.active_timer(client_id);

create index if not exists active_timer_project_id_idx
  on public.active_timer(project_id);

alter table public.active_timer enable row level security;

drop policy if exists "active_timer_select_own" on public.active_timer;
create policy "active_timer_select_own"
  on public.active_timer for select
  using (user_id = auth.uid());

drop policy if exists "active_timer_insert_own" on public.active_timer;
create policy "active_timer_insert_own"
  on public.active_timer for insert
  with check (user_id = auth.uid());

drop policy if exists "active_timer_delete_own" on public.active_timer;
create policy "active_timer_delete_own"
  on public.active_timer for delete
  using (user_id = auth.uid());

-- =========================
-- Business: General expenses
-- =========================
create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  date date not null,
  category text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.business_expenses add column if not exists amount_original numeric(12,2);
alter table public.business_expenses add column if not exists currency varchar(8) default 'EUR';
alter table public.business_expenses add column if not exists exchange_rate numeric(18,8) default 1;

update public.business_expenses
set
  amount_original = amount,
  currency = 'EUR',
  exchange_rate = 1
where amount_original is null;

alter table public.business_expenses enable row level security;
create index if not exists business_expenses_user_id_idx
  on public.business_expenses(user_id);
create index if not exists business_expenses_date_idx
  on public.business_expenses(date);

drop policy if exists "business_expenses_select_own" on public.business_expenses;
create policy "business_expenses_select_own"
  on public.business_expenses for select
  using (user_id = auth.uid());

drop policy if exists "business_expenses_insert_own" on public.business_expenses;
create policy "business_expenses_insert_own"
  on public.business_expenses for insert
  with check (user_id = auth.uid());

drop policy if exists "business_expenses_update_own" on public.business_expenses;
create policy "business_expenses_update_own"
  on public.business_expenses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "business_expenses_delete_own" on public.business_expenses;
create policy "business_expenses_delete_own"
  on public.business_expenses for delete
  using (user_id = auth.uid());

-- =========================
-- Business: General expense templates
-- =========================
create table if not exists public.general_expenses_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  category text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.general_expenses_templates enable row level security;
create index if not exists general_expenses_templates_user_id_idx
  on public.general_expenses_templates(user_id);
create index if not exists general_expenses_templates_is_active_idx
  on public.general_expenses_templates(is_active);

drop policy if exists "general_expenses_templates_select_own" on public.general_expenses_templates;
create policy "general_expenses_templates_select_own"
  on public.general_expenses_templates for select
  using (user_id = auth.uid());

drop policy if exists "general_expenses_templates_insert_own" on public.general_expenses_templates;
create policy "general_expenses_templates_insert_own"
  on public.general_expenses_templates for insert
  with check (user_id = auth.uid());

drop policy if exists "general_expenses_templates_update_own" on public.general_expenses_templates;
create policy "general_expenses_templates_update_own"
  on public.general_expenses_templates for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "general_expenses_templates_delete_own" on public.general_expenses_templates;
create policy "general_expenses_templates_delete_own"
  on public.general_expenses_templates for delete
  using (user_id = auth.uid());

-- =========================
-- Business: Mileage
-- =========================
create table if not exists public.mileage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  distance_km numeric(10,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.mileage enable row level security;
create index if not exists mileage_user_id_idx on public.mileage(user_id);
create index if not exists mileage_date_idx on public.mileage(date);
create index if not exists mileage_project_id_idx on public.mileage(project_id);

drop policy if exists "mileage_select_own" on public.mileage;
create policy "mileage_select_own"
  on public.mileage for select
  using (user_id = auth.uid());

drop policy if exists "mileage_insert_own" on public.mileage;
create policy "mileage_insert_own"
  on public.mileage for insert
  with check (user_id = auth.uid());

drop policy if exists "mileage_update_own" on public.mileage;
create policy "mileage_update_own"
  on public.mileage for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "mileage_delete_own" on public.mileage;
create policy "mileage_delete_own"
  on public.mileage for delete
  using (user_id = auth.uid());

-- =========================
-- Feedback (user submissions; admin reads all)
-- RLS admin email must match src/lib/admin.ts (DEFAULT_ADMIN_EMAIL / ADMIN_EMAIL).
-- =========================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  display_name text,
  message text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists user_email text;
alter table public.feedback
  add column if not exists display_name text;
alter table public.feedback
  add column if not exists completed boolean not null default false;

alter table public.feedback enable row level security;
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
  on public.feedback for insert
  with check (
    user_id = auth.uid()
    and (
      user_email is null
      or lower(trim(coalesce(user_email, ''))) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
    )
  );

drop policy if exists "feedback_select_admin" on public.feedback;
create policy "feedback_select_admin"
  on public.feedback for select
  using (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'roger33354@hotmail.com'
  );

drop policy if exists "feedback_update_admin" on public.feedback;
create policy "feedback_update_admin"
  on public.feedback for update
  using (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'roger33354@hotmail.com'
  )
  with check (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'roger33354@hotmail.com'
  );

drop policy if exists "feedback_delete_admin" on public.feedback;
create policy "feedback_delete_admin"
  on public.feedback for delete
  using (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'roger33354@hotmail.com'
  );

-- =========================
-- AI usage limits (per user per day)
-- =========================
create table if not exists public.user_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  requests_count integer not null default 0,
  last_request_at timestamptz,
  primary key (user_id, date)
);

alter table public.user_ai_usage enable row level security;

drop policy if exists "user_ai_usage_select_own" on public.user_ai_usage;
create policy "user_ai_usage_select_own"
  on public.user_ai_usage for select
  using (user_id = auth.uid());

drop policy if exists "user_ai_usage_insert_own" on public.user_ai_usage;
create policy "user_ai_usage_insert_own"
  on public.user_ai_usage for insert
  with check (user_id = auth.uid());

drop policy if exists "user_ai_usage_update_own" on public.user_ai_usage;
create policy "user_ai_usage_update_own"
  on public.user_ai_usage for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================
-- Subscriptions (plan from DB; Stripe webhooks update via service role)
-- =========================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  status text not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.subscriptions
  add column if not exists stripe_customer_id text;

alter table public.subscriptions
  add column if not exists stripe_subscription_id text;

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
  add column if not exists subscription_current_period_end timestamptz;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'basic', 'pro'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('active', 'cancelled'));

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

