import { useMemo, useState } from 'react'
import { formatMoney, formatPct, type Currency } from '../lib/format'
import type { Investment } from '../lib/types'

interface Props {
  items: Investment[]
}

export function InvestmentsAnalysis({ items }: Props) {
  const [currency, setCurrency] = useState<Currency>('ARS')

  const data = useMemo(() => {
    const list = items.filter((i) => i.currency === currency)
    let invertido = 0
    let actual = 0
    const typeMap = new Map<string, number>()
    let best: { name: string; pct: number } | null = null

    for (const i of list) {
      const val = i.current_value ?? i.amount_invested
      invertido += i.amount_invested
      actual += val
      const t = i.type || 'Sin tipo'
      typeMap.set(t, (typeMap.get(t) ?? 0) + val)
      if (i.current_value !== null && i.amount_invested > 0) {
        const pct = ((i.current_value - i.amount_invested) / i.amount_invested) * 100
        if (!best || pct > best.pct) best = { name: i.name, pct }
      }
    }

    const rend = actual - invertido
    const pct = invertido > 0 ? (rend / invertido) * 100 : 0

    const byType = [...typeMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
    const typeMax = Math.max(0, ...byType.map((t) => t.amount))

    const ranking = list
      .map((i) => ({
        name: i.name,
        has: i.current_value !== null,
        pct:
          i.current_value !== null && i.amount_invested > 0
            ? ((i.current_value - i.amount_invested) / i.amount_invested) * 100
            : 0,
        rend: (i.current_value ?? i.amount_invested) - i.amount_invested,
      }))
      .sort((a, b) => b.pct - a.pct)

    return {
      count: list.length,
      invertido,
      actual,
      rend,
      pct,
      byType,
      typeMax,
      ranking,
      best,
    }
  }, [items, currency])

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

      {data.count === 0 ? (
        <div className="card welcome-card">
          <p className="muted">Todavía no hay inversiones en esta moneda para analizar.</p>
        </div>
      ) : (
        <>
          <div className="card total-card">
            <span className="stat-label">Valor actual de tu cartera</span>
            <span className="total-big">{formatMoney(data.actual, currency)}</span>
            <span className={data.rend >= 0 ? 'delta delta-up' : 'delta delta-down'}>
              {data.rend >= 0 ? '▲' : '▼'} {formatMoney(data.rend, currency)} ({formatPct(data.pct)})
            </span>
          </div>

          <div className="kpi-grid">
            <div className="card kpi">
              <span className="kpi-label">Total invertido</span>
              <span className="kpi-value">{formatMoney(data.invertido, currency)}</span>
            </div>
            <div className="card kpi">
              <span className="kpi-label">Rendimiento</span>
              <span className={data.rend >= 0 ? 'kpi-value rend-up' : 'kpi-value rend-down'}>
                {formatPct(data.pct)}
              </span>
            </div>
            <div className="card kpi">
              <span className="kpi-label">Mejor rendimiento</span>
              <span className="kpi-value kpi-text">{data.best ? data.best.name : '—'}</span>
            </div>
            <div className="card kpi">
              <span className="kpi-label">Inversiones</span>
              <span className="kpi-value">{data.count}</span>
            </div>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Distribución por tipo (valor actual)</h3>
            <div className="hbars">
              {data.byType.map((t) => {
                const pct = data.typeMax > 0 ? (t.amount / data.typeMax) * 100 : 0
                return (
                  <div className="hbar-row" key={t.name}>
                    <div className="hbar-head">
                      <span className="hbar-name">{t.name}</span>
                      <span className="hbar-amount">{formatMoney(t.amount, currency)}</span>
                    </div>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card chart-card">
            <h3 className="chart-title">Rendimiento por inversión</h3>
            <div className="rank">
              {data.ranking.map((r) => (
                <div className="rank-row" key={r.name}>
                  <span className="rank-name">{r.name}</span>
                  {r.has ? (
                    <span className={r.pct >= 0 ? 'rank-pct rend-up' : 'rank-pct rend-down'}>
                      {formatPct(r.pct)} ({formatMoney(r.rend, currency)})
                    </span>
                  ) : (
                    <span className="muted-inline">Sin valor actual</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
