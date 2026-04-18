-- Mileage: trip type + locations.
-- Keeps existing entries working by using safe defaults.

alter table public.mileage
  add column if not exists trip_type text not null default 'one_way';

alter table public.mileage
  add column if not exists start_location text not null default 'home';

alter table public.mileage
  add column if not exists end_location text;

-- Guardrails.
alter table public.mileage
  drop constraint if exists mileage_trip_type_check;

alter table public.mileage
  add constraint mileage_trip_type_check
  check (trip_type in ('one_way', 'round_trip'));

alter table public.mileage
  drop constraint if exists mileage_distance_non_negative_check;

alter table public.mileage
  add constraint mileage_distance_non_negative_check
  check (distance_km >= 0);

