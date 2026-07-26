-- =====================================================================
-- PUGGY — Gastos: medio de pago + tabla de cambios por mes
-- RLS ACTIVADO. Se puede correr varias veces sin romper nada.
-- =====================================================================

-- 1) Medio de pago en cada gasto (efectivo, tarjeta, transferencia/QR, etc.)
alter table public.expenses add column if not exists payment_method text;

-- 2) Cambios/borrados de un gasto mensual en un mes puntual (igual que ingresos)
create table if not exists public.expense_overrides (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expense_id     uuid not null references public.expenses(id) on delete cascade,
  period         date not null,
  status         text not null check (status in ('deleted','edited')),
  description    text,
  amount         numeric(14,2) check (amount is null or amount >= 0),
  currency       text check (currency in ('ARS','USD')),
  category       text,
  payment_method text,
  override_date  date,
  created_at     timestamptz not null default now(),
  unique (expense_id, period)
);

create index if not exists idx_expense_overrides_user on public.expense_overrides(user_id);

alter table public.expense_overrides enable row level security;

drop policy if exists expense_overrides_all_own on public.expense_overrides;
create policy expense_overrides_all_own on public.expense_overrides
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
