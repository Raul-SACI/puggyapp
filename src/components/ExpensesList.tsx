import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney } from '../lib/format'
import type { MovItem } from '../lib/movements'
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm'

interface Props {
  items: MovItem[]
  loading: boolean
  error: string
  reload: () => Promise<void>
}

function toRow(v: ExpenseFormValues) {
  return {
    description: v.description,
    amount: v.amount,
    currency: v.currency,
    category: v.category,
    payment_method: v.payment_method,
    is_recurring: v.is_recurring,
    expense_date: v.date,
  }
}

export function ExpensesList({ items, loading, error, reload }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MovItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const totals = useMemo(() => {
    let ars = 0
    let usd = 0
    for (const i of items) {
      if (i.currency === 'ARS') ars += i.amount
      else usd += i.amount
    }
    return { ars, usd }
  }, [items])

  async function handleSubmit(values: ExpenseFormValues) {
    if (editing) {
      const { error } = await supabase.from('expenses').update(toRow(values)).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('expenses').insert(toRow(values))
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  return (
    <div className="screen">
      <div className="stat-row">
        <div className="card stat">
          <span className="stat-label">Gastos en pesos</span>
          <span className="stat-value">{formatMoney(totals.ars, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Gastos en dólares</span>
          <span className="stat-value">{formatMoney(totals.usd, 'USD')}</span>
        </div>
      </div>

      {!showForm && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
            setConfirmDelete(null)
          }}
        >
          + Agregar gasto
        </button>
      )}

      {showForm && (
        <ExpenseForm
          title={editing ? 'Editar gasto' : 'Nuevo gasto'}
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="list">
        <h3 className="list-title">Tus gastos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">
            Todavía no cargaste gastos. Tocá “+ Agregar gasto” para empezar.
          </p>
        )}

        {items.map((it) => (
          <div key={it.id} className="card item">
            <div className="item-main">
              <div className="item-top">
                <span className="item-desc">{it.description}</span>
                <span className="item-amount">{formatMoney(it.amount, it.currency)}</span>
              </div>
              <div className="item-meta">
                {it.category && <span className="tag">{it.category}</span>}
                {it.payment_method && <span className="tag tag-pay">{it.payment_method}</span>}
                {it.is_recurring && <span className="tag tag-recur">Mensual</span>}
                <span className="item-date">{formatDateLocal(it.date)}</span>
              </div>
            </div>

            {confirmDelete === it.id ? (
              <div className="confirm">
                <span>¿Borrar?</span>
                <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(it.id)}>
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
                    setEditing(it)
                    setShowForm(true)
                    setConfirmDelete(null)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-link btn-link-danger"
                  onClick={() => setConfirmDelete(it.id)}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
