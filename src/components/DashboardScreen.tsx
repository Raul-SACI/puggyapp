import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import {
  addMonths,
  formatMoney,
  formatPct,
  monthLabel,
  todayLocal,
  ymd,
  type Currency,
} from '../lib/format'
import { monthOccurrences, sumByCurrency } from '../lib/incomes'
import { monthMovements, sumCur, type MovItem, type MovOverride } from '../lib/movements'
import type {
  Expense,
  ExpenseOverride,
  Income,
  IncomeOverride,
  Investment,
  SavingsGoal,
} from '../lib/types'

export function DashboardScreen() {
  const { user } = useAuth()
  const hoy = ymd(todayLocal())
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [view, setView] = useState({ y: hoy.y, m: hoy.m })

  const [name, setName] = useState('')
  const [incomes, setIncomes] = useState<Income[]>([])
  const [incomeOv, setIncomeOv] = useState<IncomeOverride[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseOv, setExpenseOv] = useState<ExpenseOverride[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [prof, inc, incOv, exp, expOv, invs, gls] = await Promise.all([
      user ? supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from('incomes').select('*').range(0, 999),
      supabase.from('income_overrides').select('*').range(0, 999),
      supabase.from('expenses').select('*').range(0, 999),
      supabase.from('expense_overrides').select('*').range(0, 999),
      supabase.from('investments').select('*').range(0, 999),
      supabase.from('savings_goals').select('*').range(0, 999),
    ])
    setName((prof.data?.display_name as string) || (user?.email?.split('@')[0] ?? 'amig@'))
    setIncomes(inc.error ? [] : ((inc.data ?? []) as Income[]))
    setIncomeOv(incOv.error ? [] : ((incOv.data ?? []) as IncomeOverride[]))
    setExpenses(exp.error ? [] : ((exp.data ?? []) as Expense[]))
    setExpenseOv(expOv.error ? [] : ((expOv.data ?? []) as ExpenseOverride[]))
    setInvestments(invs.error ? [] : ((invs.data ?? []) as Investment[]))
    setGoals(gls.error ? [] : ((gls.data ?? []) as SavingsGoal[]))
    setLoading(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const data = useMemo(() => {
    // Ingresos del mes
    const incOcc = monthOccurrences(incomes, incomeOv, view.y, view.m)
    const ingresos = sumByCurrency(incOcc, currency)

    // Gastos del mes
    const expItems: MovItem[] = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      payment_method: e.payment_method,
      is_recurring: e.is_recurring,
      date: e.expense_date,
    }))
    const expOverrides: MovOverride[] = expenseOv.map((o) => ({
      ref_id: o.expense_id,
      period: o.period,
      status: o.status,
      description: o.description,
      amount: o.amount,
      currency: o.currency,
      category: o.category,
      payment_method: o.payment_method,
      override_date: o.override_date,
    }))
    const expOcc = monthMovements(expItems, expOverrides, view.y, view.m)
    const gastos = sumCur(expOcc, currency)

    const balance = ingresos - gastos
    const tasaAhorro = ingresos > 0 ? (balance / ingresos) * 100 : 0

    // Top gastos por categoría
    const catMap = new Map<string, number>()
    for (const o of expOcc) {
      if (o.currency !== currency) continue
      const c = o.category || 'Sin categoría'
      catMap.set(c, (catMap.get(c) ?? 0) + o.amount)
    }
    const topCats = [...catMap.entries()]
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 4)
    const catMax = Math.max(0, ...topCats.map((c) => c.monto))

    // Inversiones (cartera actual en la moneda elegida)
    let invertido = 0
    let valorActual = 0
    for (const i of investments) {
      if (i.currency !== currency) continue
      invertido += i.amount_invested
      valorActual += i.current_value ?? i.amount_invested
    }
    const invRend = valorActual - invertido
    const invPct = invertido > 0 ? (invRend / invertido) * 100 : 0
    const hasInv = invertido > 0

    // Objetivos de la moneda elegida
    const goalsCur = goals.filter((g) => g.currency === currency)

    return {
      ingresos,
      gastos,
      balance,
      tasaAhorro,
      topCats,
      catMax,
      valorActual,
      invRend,
      invPct,
      hasInv,
      goalsCur,
    }
  }, [incomes, incomeOv, expenses, expenseOv, investments, goals, view, currency])

  const barMax = Math.max(data.ingresos, data.gastos, 1)

  return (
    <div className="screen">
      <div className="dash-hello">
        <h2 className="welcome-title">¡Hola, {name}! 👋</h2>
        <p className="welcome-hint">Tu panorama financiero de un vistazo.</p>
      </div>

      <div className="subtabs">
        <button type="button" className={currency === 'ARS' ? 'subtab subtab-on' : 'subtab'} onClick={() => setCurrency('ARS')}>
          Pesos (ARS)
        </button>
        <button type="button" className={currency === 'USD' ? 'subtab subtab-on' : 'subtab'} onClick={() => setCurrency('USD')}>
          Dólares (USD)
        </button>
      </div>

      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => setView(addMonths(view.y, view.m, -1))} aria-label="Mes anterior">
          ‹
        </button>
        <span className="cal-title">{monthLabel(view.y, view.m)}</span>
        <button type="button" className="cal-nav" onClick={() => setView(addMonths(view.y, view.m, 1))} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando tu información…</p>
      ) : (
        <>
          {/* Balance del mes */}
          <div className="card total-card">
            <span className="stat-label">Balance del mes</span>
            <span className={data.balance >= 0 ? 'total-big rend-up' : 'total-big rend-down'}>
              {formatMoney(data.balance, currency)}
            </span>
            <span className="muted">
              {data.balance >= 0 ? 'Te quedó a favor este mes.' : 'Gastaste más de lo que ingresó.'}
              {data.ingresos > 0 && ` · Tasa de ahorro: ${formatPct(data.tasaAhorro)}`}
            </span>
          </div>

          {/* Ingresos vs Gastos */}
          <div className="card chart-card">
            <h3 className="chart-title">Ingresos vs Gastos ({monthLabel(view.y, view.m).split(' ')[0]})</h3>
            <div className="hbars">
              <div className="hbar-row">
                <div className="hbar-head">
                  <span className="hbar-name">Ingresos</span>
                  <span className="hbar-amount">{formatMoney(data.ingresos, currency)}</span>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill fill-in" style={{ width: `${Math.max((data.ingresos / barMax) * 100, 2)}%` }} />
                </div>
              </div>
              <div className="hbar-row">
                <div className="hbar-head">
                  <span className="hbar-name">Gastos</span>
                  <span className="hbar-amount">{formatMoney(data.gastos, currency)}</span>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill fill-out" style={{ width: `${Math.max((data.gastos / barMax) * 100, 2)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top gastos por categoría */}
          {data.topCats.length > 0 && (
            <div className="card chart-card">
              <h3 className="chart-title">Dónde se fue la plata</h3>
              <div className="hbars">
                {data.topCats.map((c) => (
                  <div className="hbar-row" key={c.nombre}>
                    <div className="hbar-head">
                      <span className="hbar-name">{c.nombre}</span>
                      <span className="hbar-amount">{formatMoney(c.monto, currency)}</span>
                    </div>
                    <div className="hbar-track">
                      <div
                        className="hbar-fill fill-out"
                        style={{ width: `${Math.max((c.monto / data.catMax) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inversiones */}
          {data.hasInv && (
            <div className="card total-card">
              <span className="stat-label">Tu cartera de inversiones</span>
              <span className="total-big">{formatMoney(data.valorActual, currency)}</span>
              <span className={data.invRend >= 0 ? 'delta delta-up' : 'delta delta-down'}>
                {data.invRend >= 0 ? '▲' : '▼'} {formatMoney(data.invRend, currency)} ({formatPct(data.invPct)})
              </span>
            </div>
          )}

          {/* Objetivos */}
          {data.goalsCur.length > 0 && (
            <div className="card chart-card">
              <h3 className="chart-title">Tus objetivos</h3>
              <div className="list">
                {data.goalsCur.map((g) => {
                  const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
                  return (
                    <div key={g.id} className="goal-mini">
                      <div className="hbar-head">
                        <span className="hbar-name">{g.name}</span>
                        <span className="hbar-amount">{Math.round(pct)}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={pct >= 100 ? 'progress-fill progress-done' : 'progress-fill'}
                          style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
