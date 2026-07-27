import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  addMonths,
  firstOfMonthISO,
  formatCompact,
  formatMoney,
  formatPct,
  MESES_SHORT,
  monthLabel,
  parseMoney,
  todayLocal,
  ymd,
  type Currency,
} from '../lib/format'
import { monthOccurrences, sumByCurrency } from '../lib/incomes'
import type { Income, IncomeOverride, InflationRate } from '../lib/types'

interface Props {
  incomes: Income[]
  overrides: IncomeOverride[]
  inflation: InflationRate[]
  reload: () => Promise<void>
}

interface CatRow {
  name: string
  amount: number
}

export function IncomesAnalysis({ incomes, overrides, inflation, reload }: Props) {
  const hoy = ymd(todayLocal())
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [view, setView] = useState({ y: hoy.y, m: hoy.m })

  const [editInfl, setEditInfl] = useState(false)
  const [inflInput, setInflInput] = useState('')
  const [savingInfl, setSavingInfl] = useState(false)
  const [inflError, setInflError] = useState('')

  const data = useMemo(() => {
    const curOcc = monthOccurrences(incomes, overrides, view.y, view.m)
    const prev = addMonths(view.y, view.m, -1)
    const prevOcc = monthOccurrences(incomes, overrides, prev.y, prev.m)

    const curTotal = sumByCurrency(curOcc, currency)
    const prevTotal = sumByCurrency(prevOcc, currency)
    const delta = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null

    // Ventana de 6 meses terminando en el mes visto
    const window: { y: number; m: number; total: number; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const mm = addMonths(view.y, view.m, -i)
      const occ = monthOccurrences(incomes, overrides, mm.y, mm.m)
      window.push({
        y: mm.y,
        m: mm.m,
        total: sumByCurrency(occ, currency),
        label: MESES_SHORT[mm.m - 1],
      })
    }
    const windowMax = Math.max(0, ...window.map((w) => w.total))
    const avg = window.reduce((a, w) => a + w.total, 0) / window.length

    // Categorías del mes y medios de cobro
    const catMap = new Map<string, number>()
    const colMap = new Map<string, number>()
    let count = 0
    let maxSingle = 0
    for (const o of curOcc) {
      if (o.currency !== currency) continue
      count++
      if (o.amount > maxSingle) maxSingle = o.amount
      const name = o.category || 'Sin categoría'
      catMap.set(name, (catMap.get(name) ?? 0) + o.amount)
      const col = o.collection_method || 'Sin especificar'
      colMap.set(col, (colMap.get(col) ?? 0) + o.amount)
    }
    const categories: CatRow[] = [...catMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
    const catMaxVal = Math.max(0, ...categories.map((c) => c.amount))
    const collections: CatRow[] = [...colMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
    const colMaxVal = Math.max(0, ...collections.map((c) => c.amount))

    return {
      curTotal,
      prevTotal,
      delta,
      window,
      windowMax,
      avg,
      categories,
      catMaxVal,
      collections,
      colMaxVal,
      count,
      maxSingle,
      topCat: categories[0]?.name ?? '—',
    }
  }, [incomes, overrides, view, currency])

  const inflRate = useMemo(() => {
    const period = firstOfMonthISO(view.y, view.m)
    return inflation.find((r) => r.period === period)?.rate ?? null
  }, [inflation, view])

  function goMonth(delta: number) {
    setView(addMonths(view.y, view.m, delta))
    setEditInfl(false)
    setInflError('')
  }

  async function saveInflation() {
    setInflError('')
    const rate = parseMoney(inflInput)
    if (rate === null) {
      setInflError('Poné un número válido (ej: 4,2).')
      return
    }
    setSavingInfl(true)
    const { error } = await supabase.from('inflation_rates').upsert(
      { period: firstOfMonthISO(view.y, view.m), rate },
      { onConflict: 'user_id,period' },
    )
    setSavingInfl(false)
    if (error) {
      setInflError(error.message)
      return
    }
    setEditInfl(false)
    setInflInput('')
    await reload()
  }

  const monthName = monthLabel(view.y, view.m).split(' ')[0]
  const hasData = data.window.some((w) => w.total > 0)

  return (
    <div className="screen">
      {/* Selector de moneda */}
      <div className="subtabs">
        <button
          type="button"
          className={currency === 'ARS' ? 'subtab subtab-on' : 'subtab'}
          onClick={() => setCurrency('ARS')}
        >
          Pesos (ARS)
        </button>
        <button
          type="button"
          className={currency === 'USD' ? 'subtab subtab-on' : 'subtab'}
          onClick={() => setCurrency('USD')}
        >
          Dólares (USD)
        </button>
      </div>

      {/* Navegación de mes */}
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => goMonth(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <span className="cal-title">{monthLabel(view.y, view.m)}</span>
        <button type="button" className="cal-nav" onClick={() => goMonth(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {/* Total del mes vs mes anterior */}
      <div className="card total-card">
        <span className="stat-label">Ingresos de {monthName}</span>
        <span className="total-big">{formatMoney(data.curTotal, currency)}</span>
        {data.delta === null ? (
          <span className="muted">Sin datos del mes anterior para comparar.</span>
        ) : (
          <span className={data.delta >= 0 ? 'delta delta-up' : 'delta delta-down'}>
            {data.delta >= 0 ? '▲' : '▼'} {formatPct(data.delta)} vs mes anterior
          </span>
        )}
      </div>

      {/* Comparación con inflación (solo pesos) */}
      {currency === 'ARS' && (
        <div className="card infl-card">
          <span className="stat-label">Tus ingresos vs inflación de {monthName}</span>

          {inflRate === null && !editInfl && (
            <>
              <p className="muted">Todavía no cargaste la inflación de este mes.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditInfl(true)
                  setInflInput('')
                }}
              >
                Cargar inflación de {monthName}
              </button>
            </>
          )}

          {editInfl && (
            <div className="infl-edit">
              <div className="amount-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inflInput}
                  onChange={(e) => setInflInput(e.target.value)}
                  placeholder="Ej: 4,2"
                  className="amount-input"
                />
                <span className="infl-pct">%</span>
              </div>
              {inflError && <p className="error-msg">{inflError}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditInfl(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" disabled={savingInfl} onClick={saveInflation}>
                  {savingInfl ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {inflRate !== null && !editInfl && (
            <>
              <div className="infl-rows">
                <div className="infl-row">
                  <span>Tus ingresos</span>
                  <span className="infl-val">
                    {data.delta === null ? '—' : formatPct(data.delta)}
                  </span>
                </div>
                <div className="infl-row">
                  <span>Inflación del mes</span>
                  <span className="infl-val">{formatPct(inflRate)}</span>
                </div>
              </div>

              {data.delta !== null && (
                <p
                  className={
                    data.delta - inflRate >= 0 ? 'verdict verdict-good' : 'verdict verdict-bad'
                  }
                >
                  {data.delta - inflRate >= 0
                    ? `Le ganaste a la inflación por ${formatPct(data.delta - inflRate)}`
                    : `Quedaste debajo de la inflación por ${formatPct(inflRate - data.delta)}`}
                </p>
              )}

              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setEditInfl(true)
                  setInflInput(String(inflRate).replace('.', ','))
                }}
              >
                Editar inflación
              </button>
            </>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="card kpi">
          <span className="kpi-label">Promedio (6 meses)</span>
          <span className="kpi-value">{formatMoney(data.avg, currency)}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Ingreso más alto del mes</span>
          <span className="kpi-value">{formatMoney(data.maxSingle, currency)}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Categoría top del mes</span>
          <span className="kpi-value kpi-text">{data.topCat}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Ingresos cargados</span>
          <span className="kpi-value">{data.count}</span>
        </div>
      </div>

      {/* Evolución mes a mes */}
      <div className="card chart-card">
        <h3 className="chart-title">Evolución (últimos 6 meses)</h3>
        {!hasData ? (
          <p className="muted">Todavía no hay ingresos para mostrar.</p>
        ) : (
          <div className="bars">
            {data.window.map((w) => {
              const pct = data.windowMax > 0 ? (w.total / data.windowMax) * 100 : 0
              return (
                <div className="bar-col" key={`${w.y}-${w.m}`}>
                  <span className="bar-val">
                    {w.total > 0 ? formatCompact(w.total, currency) : ''}
                  </span>
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

      {/* Ingresos por categoría */}
      <div className="card chart-card">
        <h3 className="chart-title">Ingresos por categoría ({monthName})</h3>
        {data.categories.length === 0 ? (
          <p className="muted">No hay ingresos este mes en esta moneda.</p>
        ) : (
          <div className="hbars">
            {data.categories.map((c) => {
              const pct = data.catMaxVal > 0 ? (c.amount / data.catMaxVal) * 100 : 0
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

      {/* Ingresos por medio de cobro */}
      <div className="card chart-card">
        <h3 className="chart-title">Ingresos por medio de cobro ({monthName})</h3>
        {data.collections.length === 0 ? (
          <p className="muted">No hay ingresos este mes en esta moneda.</p>
        ) : (
          <div className="hbars">
            {data.collections.map((c) => {
              const pct = data.colMaxVal > 0 ? (c.amount / data.colMaxVal) * 100 : 0
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
