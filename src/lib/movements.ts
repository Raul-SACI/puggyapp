import {
  daysInMonth,
  firstOfMonthISO,
  monthLte,
  ymd,
  type Currency,
} from './format'

/** Un movimiento normalizado (sirve para gastos; mismo patrón que ingresos). */
export interface MovItem {
  id: string
  description: string
  amount: number
  currency: Currency
  category: string | null
  payment_method: string | null
  is_recurring: boolean
  date: string // YYYY-MM-DD
}

export interface MovOverride {
  ref_id: string
  period: string // YYYY-MM-01
  status: 'deleted' | 'edited'
  description: string | null
  amount: number | null
  currency: Currency | null
  category: string | null
  payment_method: string | null
  override_date: string | null
}

export interface MovOccurrence {
  key: string
  kind: 'one' | 'recur'
  ref: MovItem
  day: number
  description: string
  amount: number
  currency: Currency
  category: string | null
  payment_method: string | null
}

/**
 * Ocurrencias de un mes (y, m) para una lista de movimientos, incluyendo los
 * mensuales que se repiten y aplicando los cambios/borrados por mes.
 */
export function monthMovements(
  items: MovItem[],
  overrides: MovOverride[],
  y: number,
  m: number,
): MovOccurrence[] {
  const overrideMap = new Map<string, MovOverride>()
  for (const ov of overrides) overrideMap.set(`${ov.ref_id}|${ov.period}`, ov)

  const period = firstOfMonthISO(y, m)
  const maxDay = daysInMonth(y, m)
  const occ: MovOccurrence[] = []

  for (const it of items) {
    const start = ymd(it.date)

    if (!it.is_recurring) {
      if (start.y === y && start.m === m) {
        occ.push({
          key: it.id,
          kind: 'one',
          ref: it,
          day: start.d,
          description: it.description,
          amount: it.amount,
          currency: it.currency,
          category: it.category,
          payment_method: it.payment_method,
        })
      }
      continue
    }

    if (!monthLte(start.y, start.m, y, m)) continue
    const ov = overrideMap.get(`${it.id}|${period}`)
    if (ov?.status === 'deleted') continue

    let day = Math.min(start.d, maxDay)
    let description = it.description
    let amount = it.amount
    let currency = it.currency
    let category = it.category
    let payment_method = it.payment_method

    if (ov?.status === 'edited') {
      if (ov.override_date) day = Math.min(ymd(ov.override_date).d, maxDay)
      description = ov.description ?? it.description
      amount = ov.amount ?? it.amount
      currency = ov.currency ?? it.currency
      category = ov.category
      payment_method = ov.payment_method
    }

    occ.push({
      key: `${it.id}|${period}`,
      kind: 'recur',
      ref: it,
      day,
      description,
      amount,
      currency,
      category,
      payment_method,
    })
  }

  return occ
}

export function sumCur(
  occ: { amount: number; currency: Currency }[],
  currency: Currency,
): number {
  let t = 0
  for (const o of occ) if (o.currency === currency) t += o.amount
  return t
}
