-- =====================================================================
-- PUGGY — Preferencias del usuario (onboarding / guía). RLS ACTIVADO.
-- Guarda si el usuario ya vio el tour de bienvenida y qué "globitos"
-- de ayuda ya cerró. Se puede correr varias veces sin romper nada.
-- =====================================================================

create table if not exists public.user_prefs (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  onboarding_done boolean not null default false,
  tips_seen       jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

alter table public.user_prefs enable row level security;

drop policy if exists user_prefs_all_own on public.user_prefs;
create policy user_prefs_all_own on public.user_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
