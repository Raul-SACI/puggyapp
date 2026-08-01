-- =====================================================================
-- PUGGY — Cuentas / billeteras (Paso 1). RLS ACTIVADO.
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  type            text not null,          -- Efectivo, Banco, Billetera virtual, Tarjeta de crédito, Otro
  currency        text not null check (currency in ('ARS','USD')),
  opening_balance numeric(14,2) not null default 0,  -- saldo (o deuda, si es tarjeta) de arranque
  created_at      timestamptz not null default now()
);

create index if not exists idx_accounts_user on public.accounts(user_id);

alter table public.accounts enable row level security;

drop policy if exists accounts_all_own on public.accounts;
create policy accounts_all_own on public.accounts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
