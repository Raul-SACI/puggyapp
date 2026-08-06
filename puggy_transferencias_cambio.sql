-- =====================================================================
-- PUGGY — Cambio de moneda dentro de Transferencias. RLS ACTIVADO.
-- Agrega a la tabla transfers dos columnas OPCIONALES para poder
-- registrar una compra/venta de dólares (sale un monto en una moneda,
-- entra otro monto en la otra moneda).
--   · to_amount   = cuánto ENTRA en la cuenta destino
--   · to_currency = moneda de la cuenta destino
-- En una transferencia normal (misma moneda) quedan en NULL: el destino
-- recibe el mismo 'amount' en 'currency', como hasta ahora.
-- Idempotente: se puede correr varias veces sin romper nada.
-- =====================================================================

-- 1) Columnas nuevas (aditivas, opcionales: no afectan datos viejos).
alter table public.transfers
  add column if not exists to_amount   numeric(14,2),
  add column if not exists to_currency text;

-- 2) Reglas de integridad (idempotentes: se borran y se recrean).
--    a) Si hay monto de destino, tiene que ser mayor a cero.
alter table public.transfers drop constraint if exists transfers_to_amount_pos;
alter table public.transfers add constraint transfers_to_amount_pos
  check (to_amount is null or to_amount > 0);

--    b) La moneda de destino, si existe, es ARS o USD.
alter table public.transfers drop constraint if exists transfers_to_currency_valid;
alter table public.transfers add constraint transfers_to_currency_valid
  check (to_currency is null or to_currency in ('ARS','USD'));

--    c) Van de a pares: o los dos en NULL (transfer normal),
--       o los dos cargados (cambio de moneda).
alter table public.transfers drop constraint if exists transfers_fx_pair;
alter table public.transfers add constraint transfers_fx_pair
  check ((to_amount is null) = (to_currency is null));

-- 3) RLS ya está activado en transfers; se reafirma la política por las dudas.
alter table public.transfers enable row level security;

drop policy if exists transfers_all_own on public.transfers;
create policy transfers_all_own on public.transfers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
