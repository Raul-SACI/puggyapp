import { useMemo, useState } from 'react'
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
import {
  monthMovements,
  sumCur,
  type MovItem,
  type MovOverride,
} from '../lib/movements'

interface Props {
  items: MovItem[]
  overrides: MovOverride[]
}

interface Row {
  name: string
  amount: number
}

export function ExpensesAnalysis({ items, overrides }: Props) {
  const hoy = ymd(todayLocal())
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [view, setView] = useState({ y: hoy.y, m: hoy.m })

  const data = useMemo(() => {
    const curOcc = monthMovements(items, overrides, view.y, view.m)
    const prev = addMonths(view.y, view.m, -1)
    const prevOcc = monthMovements(items, overrides, prev.y, prev.m)

    const curTotal = sumCur(curOcc, currency)
    const prevTotal = sumCur(prevOcc, currency)
    const delta = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null

    const window: { y: number; m: number; total: number; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const mm = addMonths(view.y, view.m, -i)
      const occ = monthMovements(items, overrides, mm.y, mm.m)
      window.push({ y: mm.y, m: mm.m, total: sumCur(occ, currency), label: MESES_SHORT[mm.m - 1] })
    }
    const windowMax = Math.max(0, ...window.map((w) => w.total))
    const avg = window.reduce((a, w) => a + w.total, 0) / window.length

    const catMap = new Map<string, number>()
    const payMap = new Map<string, number>()
    let count = 0
    let maxSingle = 0
    for (const o of curOcc) {
      if (o.currency !== currency) continue
      count++
      if (o.amount > maxSingle) maxSingle = o.amount
      const cat = o.category || 'Sin categoría'
      catMap.set(cat, (catMap.get(cat) ?? 0) + o.amount)
      const pay = o.payment_method || 'Sin especificar'
      payMap.set(pay, (payMap.get(pay) ?? 0) + o.amount)
    }
    const categories: Row[] = [...catMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
    const payments: Row[] = [...payMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    return {
      curTotal,
      delta,
      window,
      windowMax,
      avg,
      categories,
      catMax: Math.max(0, ...categories.map((c) => c.amount)),
      payments,
      payMax: Math.max(0, ...payments.map((c) => c.amount)),
      count,
      maxSingle,
      topCat: categories[0]?.name ?? '—',
    }
  }, [items, overrides, view, currency])

  const monthName = monthLabel(view.y, view.m).split(' ')[0]
  const hasData = data.window.some((w) => w.total > 0)

  return (
    <div className="screen">
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

      <div className="card total-card">
        <span className="stat-label">Gastos de {monthName}</span>
        <span className="total-big">{formatMoney(data.curTotal, currency)}</span>
        {data.delta === null ? (
          <span className="muted">Sin datos del mes anterior para comparar.</span>
        ) : (
          // En gastos, que BAJEN es lo bueno (verde); que suban, rojo.
          <span className={data.delta <= 0 ? 'delta delta-up' : 'delta delta-down'}>
            {data.delta <= 0 ? '▼' : '▲'} {formatPct(data.delta)} vs mes anterior
          </span>
        )}
      </div>

      <div className="kpi-grid">
        <div className="card kpi">
          <span className="kpi-label">Promedio (6 meses)</span>
          <span className="kpi-value">{formatMoney(data.avg, currency)}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Gasto más alto del mes</span>
          <span className="kpi-value">{formatMoney(data.maxSingle, currency)}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Categoría top del mes</span>
          <span className="kpi-value kpi-text">{data.topCat}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Gastos cargados</span>
          <span className="kpi-value">{data.count}</span>
        </div>
      </div>

      <div className="card chart-card">
        <h3 className="chart-title">Evolución (últimos 6 meses)</h3>
        {!hasData ? (
          <p className="muted">Todavía no hay gastos para mostrar.</p>
        ) : (
          <div className="bars">
            {data.window.map((w) => {
              const pct = data.windowMax > 0 ? (w.total / data.windowMax) * 100 : 0
              return (
                <div className="bar-col" key={`${w.y}-${w.m}`}>
                  <span className="bar-val">{w.total > 0 ? formatCompact(w.total, currency) : ''}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="bar-label">{w.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card chart-card">
        <h3 className="chart-title">Gastos por categoría ({monthName})</h3>
        {data.categories.length === 0 ? (
          <p className="muted">No hay gastos este mes en esta moneda.</p>
        ) : (
          <div className="hbars">
            {data.categories.map((c) => {
              const pct = data.catMax > 0 ? (c.amount / data.catMax) * 100 : 0
              return (
                <div className="hbar-row" key={c.name}>
                  <div className="hbar-head">
                    <span className="hbar-name">{c.name}</span>
                    <span className="hbar-amount">{formatMoney(c.amount, currency)}</span>
                  </div>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card chart-card">
        <h3 className="chart-title">Gastos por cuenta ({monthName})</h3>
        {data.payments.length === 0 ? (
          <p className="muted">No hay gastos este mes en esta moneda.</p>
        ) : (
          <div className="hbars">
            {data.payments.map((c) => {
              const pct = data.payMax > 0 ? (c.amount / data.payMax) * 100 : 0
              return (
                <div className="hbar-row" key={c.name}>
                  <div className="hbar-head">
                    <span className="hbar-name">{c.name}</span>
                    <span className="hbar-amount">{formatMoney(c.amount, currency)}</span>
                  </div>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
