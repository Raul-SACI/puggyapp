-- =====================================================================
-- PUGGY — Cuenta de origen en Inversiones. RLS ya activo en investments.
-- Al invertir, la plata sale de una cuenta (ej: Mercado Pago).
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

alter table public.investments
  add column if not exists account_id uuid references public.accounts(id) on delete set null;
