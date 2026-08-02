import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney, formatPct, type Currency } from '../lib/format'
import type { Account, Investment } from '../lib/types'
import { InvestmentForm, type InvestmentFormValues } from './InvestmentForm'
import { CoachMark } from './CoachMark'

interface Props {
  items: Investment[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  cuentas: Account[]
}

interface Summary {
  invertido: number
  actual: number
}

export function InvestmentsList({ items, loading, error, reload, cuentas }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const summaries = useMemo(() => {
    const m: Record<Currency, Summary> = {
      ARS: { invertido: 0, actual: 0 },
      USD: { invertido: 0, actual: 0 },
    }
    for (const i of items) {
      m[i.currency].invertido += i.amount_invested
      m[i.currency].actual += i.current_value ?? i.amount_invested
    }
    return m
  }, [items])

  async function handleSubmit(values: InvestmentFormValues) {
    if (editing) {
      const { error } = await supabase.from('investments').update(values).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('investments').insert(values)
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  const currencies: Currency[] = (['ARS', 'USD'] as Currency[]).filter(
    (c) => summaries[c].invertido > 0,
  )

  const accName = (id: string | null) =>
    id ? (cuentas.find((c) => c.id === id)?.name ?? null) : null

  return (
    <div className="screen">
      {currencies.map((c) => {
        const s = summaries[c]
        const rend = s.actual - s.invertido
        const pct = s.invertido > 0 ? (rend / s.invertido) * 100 : 0
        return (
          <div key={c} className="card inv-summary">
            <span className="stat-label">Cartera en {c === 'ARS' ? 'pesos' : 'dólares'}</span>
            <div className="inv-rows">
              <div className="inv-row">
                <span>Invertido</span>
                <span className="inv-val">{formatMoney(s.invertido, c)}</span>
              </div>
              <div className="inv-row">
                <span>Valor actual</span>
                <span className="inv-val">{formatMoney(s.actual, c)}</span>
              </div>
              <div className="inv-row">
                <span>Rendimiento</span>
                <span className={rend >= 0 ? 'inv-val rend-up' : 'inv-val rend-down'}>
                  {formatMoney(rend, c)} ({formatPct(pct)})
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {!showForm && (
        <>
          <CoachMark
            tipKey="tip_inversiones"
            text="Cargá tus inversiones (plazo fijo, dólares, acciones…) para seguir cuánto rinden con el tiempo."
          />
          <button
            type="button"
            className="btn-primary btn-blue"
            onClick={() => {
              setEditing(null)
              setShowForm(true)
              setConfirmDelete(null)
            }}
          >
            + Agregar inversión
          </button>
        </>
      )}

      {showForm && (
        <InvestmentForm
          title={editing ? 'Editar inversión' : 'Nueva inversión'}
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          initial={editing ?? undefined}
          cuentas={cuentas}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="list">
        <h3 className="list-title">Tus inversiones</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">
            Todavía no cargaste inversiones. Tocá “+ Agregar inversión” para empezar.
          </p>
        )}

        {items.map((inv) => {
          const hasCurrent = inv.current_value !== null
          const rend = (inv.current_value ?? inv.amount_invested) - inv.amount_invested
          const pct = inv.amount_invested > 0 ? (rend / inv.amount_invested) * 100 : 0
          const shown = inv.current_value ?? inv.amount_invested
          return (
            <div key={inv.id} className="card item">
              <div className="item-main">
                <div className="item-top">
                  <span className="item-desc">{inv.name}</span>
                  <span className="item-amount">{formatMoney(shown, inv.currency)}</span>
                </div>
                <div className="item-meta">
                  {inv.type && <span className="tag">{inv.type}</span>}
                  {accName(inv.account_id) && (
                    <span className="tag tag-pay">💳 {accName(inv.account_id)}</span>
                  )}
                  {hasCurrent ? (
                    <span className={rend >= 0 ? 'tag rend-tag-up' : 'tag rend-tag-down'}>
                      {formatPct(pct)} ({formatMoney(rend, inv.currency)})
                    </span>
                  ) : (
                    <span className="muted-inline">Sin valor actual</span>
                  )}
                </div>
                {hasCurrent && (
                  <div className="inv-sub">
                    Invertido {formatMoney(inv.amount_invested, inv.currency)}
                  </div>
                )}
                {inv.notes && <div className="inv-note">{inv.notes}</div>}
              </div>

              {confirmDelete === inv.id ? (
                <div className="confirm">
                  <span>¿Borrar?</span>
                  <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(inv.id)}>
                    Sí
                  </button>
                  <button type="button" className="btn-secondary btn-small" onClick={() => setConfirmDelete(null)}>
                    No
                  </button>
                </div>
              ) : (
                <div className="item-actions">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setEditing(inv)
                      setShowForm(true)
                      setConfirmDelete(null)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-link btn-link-danger"
                    onClick={() => setConfirmDelete(inv.id)}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
