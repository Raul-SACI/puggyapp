import type { Currency } from './format'

export interface Income {
  id: string
  description: string
  amount: number
  currency: Currency
  category: string | null
  source: string | null
  collection_method: string | null
  account_id: string | null
  is_initial: boolean
  is_recurring: boolean
  income_date: string // YYYY-MM-DD
  created_at: string
}

export interface Category {
  id: string
  kind: 'income' | 'expense'
  name: string
  created_at: string
}

export interface IncomeSource {
  id: string
  name: string
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
  source: string | null
  collection_method: string | null
  override_date: string | null // YYYY-MM-DD (día dentro del mes, si cambió)
  created_at: string
}

export interface InflationRate {
  id: string
  period: string // YYYY-MM-01
  rate: number // % mensual (ej: 4.2)
  created_at: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  currency: Currency
  category: string | null
  payment_method: string | null
  account_id: string | null
  is_recurring: boolean
  expense_date: string // YYYY-MM-DD
  created_at: string
}

export interface ExpenseOverride {
  id: string
  expense_id: string
  period: string // YYYY-MM-01
  status: 'deleted' | 'edited'
  description: string | null
  amount: number | null
  currency: Currency | null
  category: string | null
  payment_method: string | null
  override_date: string | null
  created_at: string
}

export interface Investment {
  id: string
  name: string
  type: string | null
  amount_invested: number
  current_value: number | null
  currency: Currency
  invested_at: string // YYYY-MM-DD
  notes: string | null
  created_at: string
}

export interface Account {
  id: string
  name: string
  type: string
  currency: Currency
  opening_balance: number
  created_at: string
}

export interface Reminder {
  id: string
  kind: 'cobro' | 'pago'
  title: string
  amount: number | null
  currency: Currency | null
  due_date: string // YYYY-MM-DD
  notes: string | null
  done: boolean
  created_at: string
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  currency: Currency
  target_date: string | null // YYYY-MM-DD
  created_at: string
}
