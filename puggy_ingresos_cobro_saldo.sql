-- =====================================================================
-- PUGGY — Ingresos: medio de cobro + saldo inicial
-- RLS ya activo en las tablas. Se puede correr varias veces sin romper nada.
-- =====================================================================

-- Medio de cobro (cómo entra la plata: efectivo, transferencia, etc.)
alter table public.incomes add column if not exists collection_method text;

-- Saldo inicial: marca lo que el usuario ya tenía al empezar a usar la app.
alter table public.incomes add column if not exists is_initial boolean not null default false;

-- El medio de cobro también en los cambios por mes de ingresos mensuales.
alter table public.income_overrides add column if not exists collection_method text;
