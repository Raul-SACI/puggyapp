-- =====================================================================
-- PUGGY — Transferencias entre cuentas (Paso 3). RLS ACTIVADO.
-- Incluye el "pago de tarjeta" (transferencia hacia una tarjeta).
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.transfers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_account  uuid not null references public.accounts(id) on delete cascade,
  to_account    uuid not null references public.accounts(id) on delete cascade,
  amount        numeric(14,2) not null check (amount > 0),
  currency      text not null check (currency in ('ARS','USD')),
  transfer_date date not null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_transfers_user on public.transfers(user_id);

alter table public.transfers enable row level security;

drop policy if exists transfers_all_own on public.transfers;
create policy transfers_all_own on public.transfers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
