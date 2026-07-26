-- =====================================================================
-- PUGGY — Tabla para el Calendario de Ingresos (ingresos mensuales)
-- Guarda los cambios/borrados de un ingreso mensual en un mes puntual,
-- sin tocar los demás meses. RLS ACTIVADO (cada usuario ve solo lo suyo).
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.income_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  income_id     uuid not null references public.incomes(id) on delete cascade,
  period        date not null,                 -- primer día del mes al que aplica (YYYY-MM-01)
  status        text not null check (status in ('deleted','edited')),
  description   text,
  amount        numeric(14,2) check (amount is null or amount >= 0),
  currency      text check (currency in ('ARS','USD')),
  category      text,
  override_date date,                           -- si el usuario cambia el día dentro del mes
  created_at    timestamptz not null default now(),
  unique (income_id, period)
);

create index if not exists idx_income_overrides_user on public.income_overrides(user_id);

alter table public.income_overrides enable row level security;

drop policy if exists income_overrides_all_own on public.income_overrides;
create policy income_overrides_all_own on public.income_overrides
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Verificación (opcional): debe mostrar rowsecurity = true
-- select tablename, rowsecurity from pg_tables
-- where schemaname='public' and tablename='income_overrides';
