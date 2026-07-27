-- =====================================================================
-- PUGGY — Recordatorios (de cobro y de pago). RLS ACTIVADO.
-- Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('cobro','pago')),
  title      text not null,
  amount     numeric(14,2) check (amount is null or amount >= 0),
  currency   text check (currency in ('ARS','USD')),
  due_date   date not null,
  notes      text,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_reminders_user on public.reminders(user_id);

alter table public.reminders enable row level security;

drop policy if exists reminders_all_own on public.reminders;
create policy reminders_all_own on public.reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
