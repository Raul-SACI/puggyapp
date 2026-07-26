import {
  daysInMonth,
  firstOfMonthISO,
  monthLte,
  ymd,
  type Currency,
} from './format'
import type { Income, IncomeOverride } from './types'

export interface Occurrence {
  key: string
  kind: 'one' | 'recur'
  income: Income
  day: number
  description: string
  amount: number
  currency: Currency
  category: string | null
}

/**
 * Devuelve los ingresos que caen en un mes (y, m), incluyendo los mensuales
 * (recurrentes) que se repiten, y aplicando los cambios/borrados por mes
 * guardados en income_overrides. Es la MISMA lógica que usa el Calendario,
 * así los totales del Análisis coinciden con lo que se ve en el Calendario.
 */
export function monthOccurrences(
  incomes: Income[],
  overrides: IncomeOverride[],
  y: number,
  m: number,
): Occurrence[] {
  const overrideMap = new Map<string, IncomeOverride>()
  for (const ov of overrides) overrideMap.set(`${ov.income_id}|${ov.period}`, ov)

  const period = firstOfMonthISO(y, m)
  const maxDay = daysInMonth(y, m)
  const occ: Occurrence[] = []

  for (const inc of incomes) {
    const start = ymd(inc.income_date)

    if (!inc.is_recurring) {
      if (start.y === y && start.m === m) {
        occ.push({
          key: inc.id,
          kind: 'one',
          income: inc,
          day: start.d,
          description: inc.description,
          amount: inc.amount,
          currency: inc.currency,
          category: inc.category,
        })
      }
      continue
    }

    if (!monthLte(start.y, start.m, y, m)) continue
    const ov = overrideMap.get(`${inc.id}|${period}`)
    if (ov?.status === 'deleted') continue

    let day = Math.min(start.d, maxDay)
    let description = inc.description
    let amount = inc.amount
    let currency = inc.currency
    let category = inc.category

    if (ov?.status === 'edited') {
      if (ov.override_date) day = Math.min(ymd(ov.override_date).d, maxDay)
      description = ov.description ?? inc.description
      amount = ov.amount ?? inc.amount
      currency = ov.currency ?? inc.currency
      category = ov.category
    }

    occ.push({
      key: `${inc.id}|${period}`,
      kind: 'recur',
      income: inc,
      day,
      description,
      amount,
      currency,
      category,
    })
  }

  return occ
}

/** Suma total de una lista de ocurrencias para una moneda dada. */
export function sumByCurrency(occ: Occurrence[], currency: Currency): number {
  let t = 0
  for (const o of occ) if (o.currency === currency) t += o.amount
  return t
}
