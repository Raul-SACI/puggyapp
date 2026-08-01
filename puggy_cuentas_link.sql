-- =====================================================================
-- PUGGY — Cuentas (Paso 2): vincular ingresos y gastos a una cuenta
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

alter table public.incomes  add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.expenses add column if not exists account_id uuid references public.accounts(id) on delete set null;
