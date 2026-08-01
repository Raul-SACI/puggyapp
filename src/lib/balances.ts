import { isoDate, todayLocal, ymd } from './format'
import { monthOccurrences } from './incomes'
import { monthMovements, type MovItem, type MovOverride } from './movements'
import type { Account, Income, IncomeOverride } from './types'

export const TARJETA_TYPE = 'Tarjeta de crédito'

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

  const balances = new Map<string, number>()
  for (const a of accounts) {
    const n = net.get(a.id) ?? 0
    balances.set(a.id, a.type === TARJETA_TYPE ? a.opening_balance - n : a.opening_balance + n)
  }
  return balances
}
