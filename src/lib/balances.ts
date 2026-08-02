import { isoDate, todayLocal, ymd } from './format'
import { monthOccurrences } from './incomes'
import { monthMovements, type MovItem, type MovOverride } from './movements'
import type { Account, Income, IncomeOverride, Investment, Transfer } from './types'

export const TARJETA_TYPE = 'Tarjeta de crédito'
export const PRESTAMO_DEUDA = 'Préstamo adquirido' // vos debés (deuda)
export const PRESTAMO_ACTIVO = 'Préstamo otorgado' // te deben (activo)

/** Tipos de cuenta que representan una deuda (restan del patrimonio). */
export function isDebtType(type: string): boolean {
  return type === TARJETA_TYPE || type === PRESTAMO_DEUDA
}

/**
 * Calcula el saldo actual de cada cuenta:
 *  = saldo inicial + ingresos − gastos (hasta hoy), por cuenta.
 * En tarjetas de crédito es al revés: los gastos SUMAN deuda.
 */
export function accountBalances(
  accounts: Account[],
  incomes: Income[],
  incomeOverrides: IncomeOverride[],
  expItems: MovItem[],
  expOverrides: MovOverride[],
  transfers: Transfer[] = [],
  investments: Investment[] = [],
): Map<string, number> {
  const today = todayLocal()
  const H = ymd(today)
  const curIdx = H.y * 12 + (H.m - 1)

  let minIdx = curIdx
  for (const i of incomes) {
    const d = ymd(i.income_date)
    minIdx = Math.min(minIdx, d.y * 12 + (d.m - 1))
  }
  for (const e of expItems) {
    const d = ymd(e.date)
    minIdx = Math.min(minIdx, d.y * 12 + (d.m - 1))
  }
  if (curIdx - minIdx > 600) minIdx = curIdx - 600 // límite de seguridad

  const net = new Map<string, number>() // (ingresos − gastos) por cuenta, hasta hoy
  for (let idx = minIdx; idx <= curIdx; idx++) {
    const y = Math.floor(idx / 12)
    const m = (idx % 12) + 1
    for (const o of monthOccurrences(incomes, incomeOverrides, y, m)) {
      if (!o.account_id) continue
      if (isoDate(y, m, o.day) > today) continue
      net.set(o.account_id, (net.get(o.account_id) ?? 0) + o.amount)
    }
    for (const o of monthMovements(expItems, expOverrides, y, m)) {
      if (!o.account_id) continue
      if (isoDate(y, m, o.day) > today) continue
      net.set(o.account_id, (net.get(o.account_id) ?? 0) - o.amount)
    }
  }

  // Transferencias: sale de una cuenta, entra en otra (hasta hoy).
  for (const t of transfers) {
    if (t.transfer_date > today) continue
    net.set(t.from_account, (net.get(t.from_account) ?? 0) - t.amount)
    net.set(t.to_account, (net.get(t.to_account) ?? 0) + t.amount)
  }

  // Inversiones: la plata invertida sale de la cuenta de origen (hasta hoy).
  for (const inv of investments) {
    if (!inv.account_id) continue
    if (inv.invested_at > today) continue
    net.set(inv.account_id, (net.get(inv.account_id) ?? 0) - inv.amount_invested)
  }

  const balances = new Map<string, number>()
  for (const a of accounts) {
    const n = net.get(a.id) ?? 0
    balances.set(a.id, isDebtType(a.type) ? a.opening_balance - n : a.opening_balance + n)
  }
  return balances
}
