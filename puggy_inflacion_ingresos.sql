-- =====================================================================
-- PUGGY — Tabla para cargar la inflación mensual (para el Análisis)
-- Cada usuario carga el % de inflación de cada mes. RLS ACTIVADO.
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.inflation_rates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period     date not null,                 -- primer día del mes (YYYY-MM-01)
  rate       numeric(6,2) not null,          -- % mensual, ej: 4.20
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

create index if not exists idx_inflation_rates_user on public.inflation_rates(user_id);

alter table public.inflation_rates enable row level security;

drop policy if exists inflation_rates_all_own on public.inflation_rates;
create policy inflation_rates_all_own on public.inflation_rates
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
