import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import {
  addMonths,
  formatCompact,
  formatMoney,
  formatPct,
  MESES_SHORT,
  monthLabel,
  todayLocal,
  ymd,
  type Currency,
} from '../lib/format'
import { monthOccurrences, sumByCurrency } from '../lib/incomes'
import { monthMovements, sumCur, type MovItem, type MovOverride } from '../lib/movements'
import { accountBalances, isDebtType, PRESTAMO_ACTIVO, PRESTAMO_DEUDA } from '../lib/balances'
import { CoachMark } from './CoachMark'
import type {
  Account,
  Expense,
  ExpenseOverride,
  Income,
  IncomeOverride,
  Investment,
  SavingsGoal,
  Transfer,
} from '../lib/types'

function tipoIcon(type: string): string {
  if (type === 'Efectivo') return '💵'
  if (type === 'Banco') return '🏦'
  if (type === 'Billetera virtual') return '📱'
  if (type === 'Tarjeta de crédito') return '💳'
  if (type === PRESTAMO_DEUDA) return '💸'
  if (type === PRESTAMO_ACTIVO) return '🤝'
  return '👛'
}

type Mode = 'mes' | 'anio'
interface Row {
  name: string
  amount: number
}

export function DashboardScreen() {
  const { user } = useAuth()
  const hoy = ymd(todayLocal())
  const [mode, setMode] = useState<Mode>('mes')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [view, setView] = useState({ y: hoy.y, m: hoy.m })

  const [name, setName] = useState('')
  const [incomes, setIncomes] = useState<Income[]>([])
  const [incomeOv, setIncomeOv] = useState<IncomeOverride[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseOv, setExpenseOv] = useState<ExpenseOverride[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [prof, inc, incOv, exp, expOv, invs, gls, acc, tr] = await Promise.all([
      user ? supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from('incomes').select('*').range(0, 999),
      supabase.from('income_overrides').select('*').range(0, 999),
      supabase.from('expenses').select('*').range(0, 999),
      supabase.from('expense_overrides').select('*').range(0, 999),
      supabase.from('investments').select('*').range(0, 999),
      supabase.from('savings_goals').select('*').range(0, 999),
      supabase.from('accounts').select('*').order('created_at', { ascending: true }).range(0, 999),
      supabase.from('transfers').select('*').range(0, 999),
    ])
    setName((prof.data?.display_name as string) || (user?.email?.split('@')[0] ?? 'amig@'))
    setIncomes(inc.error ? [] : ((inc.data ?? []) as Income[]))
    setIncomeOv(incOv.error ? [] : ((incOv.data ?? []) as IncomeOverride[]))
    setExpenses(exp.error ? [] : ((exp.data ?? []) as Expense[]))
    setExpenseOv(expOv.error ? [] : ((expOv.data ?? []) as ExpenseOverride[]))
    setInvestments(invs.error ? [] : ((invs.data ?? []) as Investment[]))
    setGoals(gls.error ? [] : ((gls.data ?? []) as SavingsGoal[]))
    setAccounts(acc.error ? [] : ((acc.data ?? []) as Account[]))
    setTransfers(tr.error ? [] : ((tr.data ?? []) as Transfer[]))
    setLoading(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  // Gastos normalizados (compartido por vista mensual y anual)
  const expItems: MovItem[] = useMemo(
    () =>
      expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        payment_method: e.payment_method,
        account_id: e.account_id,
        is_recurring: e.is_recurring,
        date: e.expense_date,
      })),
    [expenses],
  )
  const expOverrides: MovOverride[] = useMemo(
    () =>
      expenseOv.map((o) => ({
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
    [expenseOv],
  )

  // -------- Patrimonio (foto de HOY, según la moneda elegida) --------
  const balances = useMemo(
    () => accountBalances(accounts, incomes, incomeOv, expItems, expOverrides, transfers, investments),
    [accounts, incomes, incomeOv, expItems, expOverrides, transfers, investments],
  )
  const patrimonio = useMemo(() => {
    let activos = 0
    let deudas = 0
    const cuentas: { id: string; name: string; type: string; bal: number; esDeuda: boolean }[] = []
    for (const a of accounts) {
      if (a.currency !== currency) continue
      const bal = balances.get(a.id) ?? a.opening_balance
      const esDeuda = isDebtType(a.type)
      if (esDeuda) deudas += bal
      else activos += bal
      cuentas.push({ id: a.id, name: a.name, type: a.type, bal, esDeuda })
    }
    let inversiones = 0
    for (const i of investments) {
      if (i.currency !== currency) continue
      inversiones += i.current_value ?? i.amount_invested
    }
    return {
      activos,
      inversiones,
      deudas,
      neto: activos + inversiones - deudas,
      cuentas,
      has: cuentas.length > 0 || inversiones > 0,
    }
  }, [accounts, balances, currency, investments])

  // -------- Vista mensual --------
  const mData = useMemo(() => {
    const incOcc = monthOccurrences(incomes, incomeOv, view.y, view.m)
    const expOcc = monthMovements(expItems, expOverrides, view.y, view.m)
    const ingresos = sumByCurrency(incOcc, currency)
    const gastos = sumCur(expOcc, currency)
    const balance = ingresos - gastos
    const tasa = ingresos > 0 ? (balance / ingresos) * 100 : 0
    const catMap = new Map<string, number>()
    for (const o of expOcc) {
      if (o.currency !== currency) continue
      const c = o.category || 'Sin categoría'
      catMap.set(c, (catMap.get(c) ?? 0) + o.amount)
    }
    const topCats = [...catMap.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto).slice(0, 4)
    const catMax = Math.max(0, ...topCats.map((c) => c.monto))
    let invertido = 0
    let valorActual = 0
    for (const i of investments) {
      if (i.currency !== currency) continue
      invertido += i.amount_invested
      valorActual += i.current_value ?? i.amount_invested
    }
    return {
      ingresos, gastos, balance, tasa, topCats, catMax,
      valorActual, invRend: valorActual - invertido, invPct: invertido > 0 ? ((valorActual - invertido) / invertido) * 100 : 0, hasInv: invertido > 0,
      goalsCur: goals.filter((g) => g.currency === currency),
    }
  }, [incomes, incomeOv, expItems, expOverrides, investments, goals, view, currency])

  const barMax = Math.max(mData.ingresos, mData.gastos, 1)

  // -------- Vista anual --------
  const yData = useMemo(() => {
    const months: { m: number; inc: number; exp: number; bal: number }[] = []
    const catInc = new Map<string, number>()
    const srcInc = new Map<string, number>()
    const catExp = new Map<string, number>()
    let tInc = 0
    let tExp = 0
    for (let m = 1; m <= 12; m++) {
      const io = monthOccurrences(incomes, incomeOv, view.y, m)
      const eo = monthMovements(expItems, expOverrides, view.y, m)
      let inc = 0
      let exp = 0
      for (const o of io) {
        if (o.currency !== currency) continue
        inc += o.amount
        catInc.set(o.category || 'Sin categoría', (catInc.get(o.category || 'Sin categoría') ?? 0) + o.amount)
        srcInc.set(o.source || 'Sin fuente', (srcInc.get(o.source || 'Sin fuente') ?? 0) + o.amount)
      }
      for (const o of eo) {
        if (o.currency !== currency) continue
        exp += o.amount
        catExp.set(o.category || 'Sin categoría', (catExp.get(o.category || 'Sin categoría') ?? 0) + o.amount)
      }
      months.push({ m, inc, exp, bal: inc - exp })
      tInc += inc
      tExp += exp
    }
    const maxBar = Math.max(1, ...months.flatMap((x) => [x.inc, x.exp]))
    const toArr = (map: Map<string, number>): { arr: Row[]; max: number } => {
      const arr = [...map.entries()].map(([nombre, amount]) => ({ name: nombre, amount })).sort((a, b) => b.amount - a.amount)
      return { arr, max: Math.max(0, ...arr.map((x) => x.amount)) }
    }
    return {
      months, tInc, tExp, tBal: tInc - tExp, tasa: tInc > 0 ? ((tInc - tExp) / tInc) * 100 : 0, maxBar,
      catInc: toArr(catInc), srcInc: toArr(srcInc), catExp: toArr(catExp),
    }
  }, [incomes, incomeOv, expItems, expOverrides, view.y, currency])

  const monthName = monthLabel(view.y, view.m).split(' ')[0]

  function Hbars({ data }: { data: { arr: Row[]; max: number } }) {
    if (data.arr.length === 0) return <p className="muted">Sin datos en esta moneda.</p>
    return (
      <div className="hbars">
        {data.arr.map((c) => (
          <div className="hbar-row" key={c.name}>
            <div className="hbar-head">
              <span className="hbar-name">{c.name}</span>
              <span className="hbar-amount">{formatMoney(c.amount, currency)}</span>
            </div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${Math.max(data.max > 0 ? (c.amount / data.max) * 100 : 0, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="dash-hello">
        <h2 className="welcome-title">¡Hola, {name}! 👋</h2>
        <p className="welcome-hint">Tu panorama financiero de un vistazo.</p>
      </div>

      <CoachMark
        tipKey="tip_dashboard"
        arrow="none"
        text="Este es tu resumen: tu patrimonio (lo que tenés menos lo que debés), el balance del mes y a dónde se va la plata. Cambiá entre Mes/Año y Pesos/Dólares con los botones de abajo."
      />

      <div className="subtabs">
        <button type="button" className={mode === 'mes' ? 'subtab subtab-on' : 'subtab'} onClick={() => setMode('mes')}>
          Mes
        </button>
        <button type="button" className={mode === 'anio' ? 'subtab subtab-on' : 'subtab'} onClick={() => setMode('anio')}>
          Año
        </button>
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
        <button type="button" className="cal-nav" onClick={() => setView(mode === 'mes' ? addMonths(view.y, view.m, -1) : { ...view, y: view.y - 1 })} aria-label="Anterior">
          ‹
        </button>
        <span className="cal-title">{mode === 'mes' ? monthLabel(view.y, view.m) : view.y}</span>
        <button type="button" className="cal-nav" onClick={() => setView(mode === 'mes' ? addMonths(view.y, view.m, 1) : { ...view, y: view.y + 1 })} aria-label="Siguiente">
          ›
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando tu información…</p>
      ) : (
       <>
        {patrimonio.has && (
          <>
            <div className="card total-card">
              <span className="stat-label">Tu patrimonio en {currency === 'ARS' ? 'pesos' : 'dólares'} · hoy</span>
              <span className={patrimonio.neto >= 0 ? 'total-big rend-up' : 'total-big rend-down'}>
                {formatMoney(patrimonio.neto, currency)}
              </span>
              <div className="inv-rows">
                <div className="inv-row">
                  <span>Tenés en cuentas</span>
                  <span className="inv-val rend-up">{formatMoney(patrimonio.activos, currency)}</span>
                </div>
                {patrimonio.inversiones > 0 && (
                  <div className="inv-row">
                    <span>En inversiones</span>
                    <span className="inv-val rend-up">{formatMoney(patrimonio.inversiones, currency)}</span>
                  </div>
                )}
                {patrimonio.deudas > 0 && (
                  <div className="inv-row">
                    <span>Debés (tarjetas y préstamos)</span>
                    <span className="inv-val rend-down">{formatMoney(patrimonio.deudas, currency)}</span>
                  </div>
                )}
              </div>
              <span className="muted">Cuentas más inversiones, menos deudas, al día de hoy.</span>
            </div>

            <div className="card chart-card">
              <h3 className="chart-title">Saldo por cuenta</h3>
              <div className="inv-rows">
                {patrimonio.cuentas.map((c) => (
                  <div className="inv-row" key={c.id}>
                    <span>{tipoIcon(c.type)} {c.name}</span>
                    <span className={c.esDeuda ? 'inv-val rend-down' : 'inv-val rend-up'}>
                      {formatMoney(c.bal, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {mode === 'mes' ? (
        <>
          <div className="card total-card">
            <span className="stat-label">Balance del mes</span>
            <span className={mData.balance >= 0 ? 'total-big rend-up' : 'total-big rend-down'}>{formatMoney(mData.balance, currency)}</span>
            <span className="muted">
              {mData.balance >= 0 ? 'Te quedó a favor este mes.' : 'Gastaste más de lo que ingresó.'}
              {mData.ingresos > 0 && ` · Tasa de ahorro: ${formatPct(mData.tasa)}`}
            </span>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Ingresos vs Gastos ({monthName})</h3>
            <div className="hbars">
              <div className="hbar-row">
                <div className="hbar-head"><span className="hbar-name">Ingresos</span><span className="hbar-amount">{formatMoney(mData.ingresos, currency)}</span></div>
                <div className="hbar-track"><div className="hbar-fill fill-in" style={{ width: `${Math.max((mData.ingresos / barMax) * 100, 2)}%` }} /></div>
              </div>
              <div className="hbar-row">
                <div className="hbar-head"><span className="hbar-name">Gastos</span><span className="hbar-amount">{formatMoney(mData.gastos, currency)}</span></div>
                <div className="hbar-track"><div className="hbar-fill fill-out" style={{ width: `${Math.max((mData.gastos / barMax) * 100, 2)}%` }} /></div>
              </div>
            </div>
          </div>

          {mData.topCats.length > 0 && (
            <div className="card chart-card">
              <h3 className="chart-title">Dónde se fue la plata</h3>
              <div className="hbars">
                {mData.topCats.map((c) => (
                  <div className="hbar-row" key={c.nombre}>
                    <div className="hbar-head"><span className="hbar-name">{c.nombre}</span><span className="hbar-amount">{formatMoney(c.monto, currency)}</span></div>
                    <div className="hbar-track"><div className="hbar-fill fill-out" style={{ width: `${Math.max((c.monto / mData.catMax) * 100, 2)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mData.hasInv && (
            <div className="card total-card">
              <span className="stat-label">Tu cartera de inversiones</span>
              <span className="total-big">{formatMoney(mData.valorActual, currency)}</span>
              <span className={mData.invRend >= 0 ? 'delta delta-up' : 'delta delta-down'}>{mData.invRend >= 0 ? '▲' : '▼'} {formatMoney(mData.invRend, currency)} ({formatPct(mData.invPct)})</span>
            </div>
          )}

          {mData.goalsCur.length > 0 && (
            <div className="card chart-card">
              <h3 className="chart-title">Tus objetivos</h3>
              <div className="list">
                {mData.goalsCur.map((g) => {
                  const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
                  return (
                    <div key={g.id} className="goal-mini">
                      <div className="hbar-head"><span className="hbar-name">{g.name}</span><span className="hbar-amount">{Math.round(pct)}%</span></div>
                      <div className="progress-track"><div className={pct >= 100 ? 'progress-fill progress-done' : 'progress-fill'} style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* ----- Vista anual ----- */}
          <div className="kpi-grid">
            <div className="card kpi"><span className="kpi-label">Ingresos del año</span><span className="kpi-value">{formatMoney(yData.tInc, currency)}</span></div>
            <div className="card kpi"><span className="kpi-label">Gastos del año</span><span className="kpi-value">{formatMoney(yData.tExp, currency)}</span></div>
            <div className="card kpi"><span className="kpi-label">Balance del año</span><span className={yData.tBal >= 0 ? 'kpi-value rend-up' : 'kpi-value rend-down'}>{formatMoney(yData.tBal, currency)}</span></div>
            <div className="card kpi"><span className="kpi-label">Tasa de ahorro</span><span className="kpi-value">{yData.tInc > 0 ? formatPct(yData.tasa) : '—'}</span></div>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Ingresos vs Gastos por mes</h3>
            <div className="lgd">
              <span><i className="lgd-dot fill-in" /> Ingresos</span>
              <span><i className="lgd-dot fill-out" /> Gastos</span>
            </div>
            <div className="gbars">
              {yData.months.map((mm) => (
                <div className="gbar-col" key={mm.m}>
                  <div className="gbar-area">
                    <div className="gbar fill-in" style={{ height: `${(mm.inc / yData.maxBar) * 100}%` }} />
                    <div className="gbar fill-out" style={{ height: `${(mm.exp / yData.maxBar) * 100}%` }} />
                  </div>
                  <span className="gbar-label">{MESES_SHORT[mm.m - 1]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Detalle mes a mes</h3>
            <table className="ytable">
              <thead>
                <tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {yData.months.map((mm) => (
                  <tr key={mm.m}>
                    <td>{MESES_SHORT[mm.m - 1]}</td>
                    <td>{formatCompact(mm.inc, currency)}</td>
                    <td>{formatCompact(mm.exp, currency)}</td>
                    <td className={mm.bal >= 0 ? 'rend-up' : 'rend-down'}>{formatCompact(mm.bal, currency)}</td>
                  </tr>
                ))}
                <tr className="ytotal">
                  <td>Total</td>
                  <td>{formatCompact(yData.tInc, currency)}</td>
                  <td>{formatCompact(yData.tExp, currency)}</td>
                  <td className={yData.tBal >= 0 ? 'rend-up' : 'rend-down'}>{formatCompact(yData.tBal, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Ingresos por fuente (año)</h3>
            <Hbars data={yData.srcInc} />
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Ingresos por categoría (año)</h3>
            <Hbars data={yData.catInc} />
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Gastos por categoría (año)</h3>
            <Hbars data={yData.catExp} />
          </div>
        </>
        )}
       </>
      )}
    </div>
  )
}
