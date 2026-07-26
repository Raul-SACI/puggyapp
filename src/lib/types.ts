import type { Currency } from './format'

export interface Income {
  id: string
  description: string
  amount: number
  currency: Currency
  category: string | null
  is_recurring: boolean
  income_date: string // YYYY-MM-DD
  created_at: string
}

export interface IncomeOverride {
  id: string
  income_id: string
  period: string // YYYY-MM-01 (mes al que aplica)
  status: 'deleted' | 'edited'
  description: string | null
  amount: number | null
  currency: Currency | null
  category: string | null
  override_date: string | null // YYYY-MM-DD (día dentro del mes, si cambió)
  created_at: string
}

export interface InflationRate {
  id: string
  period: string // YYYY-MM-01
  rate: number // % mensual (ej: 4.2)
  created_at: string
}
