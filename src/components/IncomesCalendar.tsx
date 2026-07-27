import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  addMonths,
  daysInMonth,
  firstOfMonthISO,
  formatMoney,
  isoDate,
  monthLabel,
  todayLocal,
  weekdayMondayFirst,
  ymd,
} from '../lib/format'
import { monthOccurrences, sumByCurrency, type Occurrence } from '../lib/incomes'
import type { Income, IncomeOverride } from '../lib/types'
import { IncomeForm, type IncomeFormValues } from './IncomeForm'

interface Props {
  incomes: Income[]
  overrides: IncomeOverride[]
  reload: () => Promise<void>
}

type FormMode =
  | { mode: 'add' }
  | { mode: 'edit'; occ: Occurrence }
  | null

const DIAS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

export function IncomesCalendar({ incomes, overrides, reload }: Props) {
  const hoy = ymd(todayLocal())
  const [view, setView] = useState({ y: hoy.y, m: hoy.m })
  const [selectedDay, setSelectedDay] = useState<number | null>(
    view.y === hoy.y && view.m === hoy.m ? hoy.d : null,
  )
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const occurrences = useMemo(
    () => monthOccurrences(incomes, overrides, view.y, view.m),
    [incomes, overrides, view],
  )

  const byDay = useMemo(() => {
    const map = new Map<number, Occurrence[]>()
    for (const o of occurrences) {
      const arr = map.get(o.day) ?? []
      arr.push(o)
      map.set(o.day, arr)
    }
    return map
  }, [occurrences])

  const monthTotals = useMemo(
    () => ({
      ars: sumByCurrency(occurrences, 'ARS'),
      usd: sumByCurrency(occurrences, 'USD'),
    }),
    [occurrences],
  )

  function goMonth(delta: number) {
    const next = addMonths(view.y, view.m, delta)
    setView(next)
    setSelectedDay(next.y === hoy.y && next.m === hoy.m ? hoy.d : null)
    setFormMode(null)
    setConfirm(null)
  }

  async function handleSubmit(values: IncomeFormValues) {
    if (formMode?.mode === 'add') {
      const { error } = await supabase.from('incomes').insert(values)
      if (error) throw error
    } else if (formMode?.mode === 'edit') {
      const occ = formMode.occ
      if (occ.kind === 'one') {
        const { error } = await supabase
          .from('incomes')
          .update(values)
          .eq('id', occ.income.id)
        if (error) throw error
      } else {
        const period = firstOfMonthISO(view.y, view.m)
        const { error } = await supabase.from('income_overrides').upsert(
          {
            income_id: occ.income.id,
            period,
            status: 'edited',
            description: values.description,
            amount: values.amount,
            currency: values.currency,
            category: values.category,
            collection_method: values.collection_method,
            override_date: values.income_date,
          },
          { onConflict: 'income_id,period' },
        )
        if (error) throw error
      }
    }
    setFormMode(null)
    await reload()
  }

  async function handleDelete(occ: Occurrence) {
    setActionError('')
    if (occ.kind === 'one') {
      const { error } = await supabase.from('incomes').delete().eq('id', occ.income.id)
      if (error) {
        setActionError(error.message)
        return
      }
    } else {
      const period = firstOfMonthISO(view.y, view.m)
      const { error } = await supabase.from('income_overrides').upsert(
        {
          income_id: occ.income.id,
          period,
          status: 'deleted',
          description: null,
          amount: null,
          currency: null,
          category: null,
          override_date: null,
        },
        { onConflict: 'income_id,period' },
      )
      if (error) {
        setActionError(error.message)
        return
      }
    }
    setConfirm(null)
    await reload()
  }

  const offset = weekdayMondayFirst(view.y, view.m)
  const total = daysInMonth(view.y, view.m)
  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  const selectedOccs = selectedDay ? byDay.get(selectedDay) ?? [] : []

  return (
    <div className="screen">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => goMonth(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <span className="cal-title">{monthLabel(view.y, view.m)}</span>
        <button type="button" className="cal-nav" onClick={() => goMonth(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <span className="stat-label">Total del mes (pesos)</span>
          <span className="stat-value">{formatMoney(monthTotals.ars, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Total del mes (dólares)</span>
          <span className="stat-value">{formatMoney(monthTotals.usd, 'USD')}</span>
        </div>
      </div>

      <div className="card cal-card">
        <div className="cal-weekdays">
          {DIAS.map((d) => (
            <span key={d} className="cal-wd">{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="cal-cell cal-empty" />
            const occs = byDay.get(d) ?? []
            const isToday = view.y === hoy.y && view.m === hoy.m && d === hoy.d
            const isSel = d === selectedDay
            const cls =
              'cal-cell' + (isSel ? ' cal-sel' : '') + (isToday ? ' cal-today' : '')
            return (
              <button key={d} type="button" className={cls} onClick={() => setSelectedDay(d)}>
                <span className="cal-daynum">{d}</span>
                <span className="cal-dots">
                  {occs.slice(0, 3).map((o) => (
                    <span
                      key={o.key}
                      className={o.kind === 'recur' ? 'cal-dot cal-dot-recur' : 'cal-dot'}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="day-detail">
          <div className="day-detail-head">
            <h3 className="list-title">
              Día {selectedDay} de {monthLabel(view.y, view.m).split(' ')[0]}
            </h3>
            {!formMode && (
              <button
                type="button"
                className="btn-link"
                onClick={() => setFormMode({ mode: 'add' })}
              >
                + Agregar en este día
              </button>
            )}
          </div>

          {actionError && <p className="error-msg">{actionError}</p>}

          {formMode?.mode === 'add' && (
            <IncomeForm
              title="Nuevo ingreso"
              submitLabel="Guardar"
              showInitial={false}
              initial={{ income_date: isoDate(view.y, view.m, selectedDay) }}
              onSubmit={handleSubmit}
              onCancel={() => setFormMode(null)}
            />
          )}

          {formMode?.mode === 'edit' && (
            <IncomeForm
              title={formMode.occ.kind === 'recur' ? 'Editar (solo este mes)' : 'Editar ingreso'}
              submitLabel="Guardar cambios"
              showRecurring={formMode.occ.kind === 'one'}
              showInitial={false}
              initial={{
                description: formMode.occ.description,
                amount: formMode.occ.amount,
                currency: formMode.occ.currency,
                category: formMode.occ.category,
                collection_method: formMode.occ.collection_method,
                is_recurring: formMode.occ.income.is_recurring,
                income_date: isoDate(view.y, view.m, formMode.occ.day),
              }}
              onSubmit={handleSubmit}
              onCancel={() => setFormMode(null)}
            />
          )}

          {!formMode && selectedOccs.length === 0 && (
            <p className="muted">No hay ingresos este día.</p>
          )}

          {!formMode &&
            selectedOccs.map((o) => (
              <div key={o.key} className="card item">
                <div className="item-main">
                  <div className="item-top">
                    <span className="item-desc">{o.description}</span>
                    <span className="item-amount">{formatMoney(o.amount, o.currency)}</span>
                  </div>
                  <div className="item-meta">
                    {o.category && <span className="tag">{o.category}</span>}
                    {o.collection_method && <span className="tag tag-pay">{o.collection_method}</span>}
                    {o.kind === 'recur' && <span className="tag tag-recur">Mensual</span>}
                  </div>
                </div>

                {confirm === o.key ? (
                  <div className="confirm">
                    <span>{o.kind === 'recur' ? '¿Borrar de este mes?' : '¿Borrar?'}</span>
                    <button
                      type="button"
                      className="btn-danger btn-small"
                      onClick={() => handleDelete(o)}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => setConfirm(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setFormMode({ mode: 'edit', occ: o })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-link btn-link-danger"
                      onClick={() => setConfirm(o.key)}
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
