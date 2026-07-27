import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_EXPENSE_CATEGORIES } from '../lib/defaults'
import type { Category, Expense, ExpenseOverride } from '../lib/types'
import type { MovItem, MovOverride } from '../lib/movements'
import { ExpensesList } from './ExpensesList'
import { ExpensesCalendar } from './ExpensesCalendar'
import { ExpensesAnalysis } from './ExpensesAnalysis'
import { RemindersView } from './RemindersView'

type SubTab = 'lista' | 'calendario' | 'analisis' | 'recordatorios'

export function ExpensesScreen() {
  const [subtab, setSubtab] = useState<SubTab>('lista')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rawOverrides, setRawOverrides] = useState<ExpenseOverride[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const [expRes, ovRes, catRes] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false }).range(0, 999),
      supabase.from('expense_overrides').select('*').range(0, 999),
      supabase.from('categories').select('*').eq('kind', 'expense').range(0, 999),
    ])

    if (expRes.error) setError(expRes.error.message)
    else setExpenses((expRes.data ?? []) as Expense[])
    setRawOverrides(ovRes.error ? [] : ((ovRes.data ?? []) as ExpenseOverride[]))

    let cats = catRes.error ? [] : (catRes.data as Category[]).map((c) => c.name)
    if (!catRes.error && cats.length === 0) {
      await supabase
        .from('categories')
        .insert(DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ kind: 'expense', name })))
      cats = DEFAULT_EXPENSE_CATEGORIES
    }
    setCategorias(cats)

    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function addCategoria(name: string) {
    await supabase.from('categories').insert({ kind: 'expense', name })
    await reload()
  }
  async function deleteCategoria(name: string) {
    await supabase.from('categories').delete().eq('kind', 'expense').eq('name', name)
    await reload()
  }

  const items: MovItem[] = useMemo(
    () =>
      expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        payment_method: e.payment_method,
        is_recurring: e.is_recurring,
        date: e.expense_date,
      })),
    [expenses],
  )

  const overrides: MovOverride[] = useMemo(
    () =>
      rawOverrides.map((o) => ({
        ref_id: o.expense_id,
        period: o.period,
        status: o.status,
        description: o.description,
        amount: o.amount,
        currency: o.currency,
        category: o.category,
        payment_method: o.payment_method,
        override_date: o.override_date,
      })),
    [rawOverrides],
  )

  return (
    <div className="screen">
      <div className="subtabs">
        <button type="button" className={subtab === 'lista' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('lista')}>
          Lista
        </button>
        <button type="button" className={subtab === 'calendario' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('calendario')}>
          Calendario
        </button>
        <button type="button" className={subtab === 'analisis' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('analisis')}>
          Análisis
        </button>
        <button type="button" className={subtab === 'recordatorios' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('recordatorios')}>
          Recordatorios
        </button>
      </div>

      {subtab === 'lista' && (
        <ExpensesList
          items={items}
          loading={loading}
          error={error}
          reload={reload}
          categorias={categorias}
          onAddCategoria={addCategoria}
          onDeleteCategoria={deleteCategoria}
        />
      )}
      {subtab === 'calendario' && (
        <ExpensesCalendar items={items} overrides={overrides} reload={reload} categorias={categorias} />
      )}
      {subtab === 'analisis' && <ExpensesAnalysis items={items} overrides={overrides} />}
      {subtab === 'recordatorios' && <RemindersView kind="pago" />}
    </div>
  )
}
