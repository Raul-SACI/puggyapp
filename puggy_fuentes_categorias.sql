-- =====================================================================
-- PUGGY — Fuentes de ingreso + categorías gestionables
-- RLS ACTIVADO. Se puede correr varias veces sin romper nada.
-- =====================================================================

-- Categorías administrables por el usuario (para ingresos y gastos)
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('income','expense')),
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index if not exists idx_categories_user on public.categories(user_id);
alter table public.categories enable row level security;
drop policy if exists categories_all_own on public.categories;
create policy categories_all_own on public.categories
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fuentes de ingreso (de dónde viene la plata: cliente, empleador, etc.)
create table if not exists public.income_sources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists idx_income_sources_user on public.income_sources(user_id);
alter table public.income_sources enable row level security;
drop policy if exists income_sources_all_own on public.income_sources;
create policy income_sources_all_own on public.income_sources
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fuente en cada ingreso (y en los cambios por mes)
alter table public.incomes add column if not exists source text;
alter table public.income_overrides add column if not exists source text;
