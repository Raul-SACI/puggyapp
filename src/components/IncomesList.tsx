import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney } from '../lib/format'
import type { Income } from '../lib/types'
import { IncomeForm, type IncomeFormValues } from './IncomeForm'

interface Props {
  incomes: Income[]
  loading: boolean
  error: string
  reload: () => Promise<void>
}

export function IncomesList({ incomes, loading, error, reload }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const totals = useMemo(() => {
    let ars = 0
    let usd = 0
    for (const i of incomes) {
      if (i.currency === 'ARS') ars += i.amount
      else usd += i.amount
    }
    return { ars, usd }
  }, [incomes])

  function openNew() {
    setEditing(null)
    setShowForm(true)
    setConfirmDelete(null)
  }

  function openEdit(inc: Income) {
    setEditing(inc)
    setShowForm(true)
    setConfirmDelete(null)
  }

  async function handleSubmit(values: IncomeFormValues) {
    if (editing) {
      const { error } = await supabase
        .from('incomes')
        .update(values)
        .eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('incomes').insert(values)
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) {
      setActionError(error.message)
    } else {
      setConfirmDelete(null)
      await reload()
    }
  }

  return (
    <div className="screen">
      <div className="stat-row">
        <div className="card stat">
          <span className="stat-label">Ingresos en pesos</span>
          <span className="stat-value">{formatMoney(totals.ars, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Ingresos en dólares</span>
          <span className="stat-value">{formatMoney(totals.usd, 'USD')}</span>
        </div>
      </div>

      {!showForm && (
        <button type="button" className="btn-primary" onClick={openNew}>
          + Agregar ingreso
        </button>
      )}

      {showForm && (
        <IncomeForm
          title={editing ? 'Editar ingreso' : 'Nuevo ingreso'}
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
        <h3 className="list-title">Tus ingresos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && incomes.length === 0 && (
          <p className="muted">
            Todavía no cargaste ingresos. Tocá “+ Agregar ingreso” para empezar.
          </p>
        )}

        {incomes.map((inc) => (
          <div key={inc.id} className="card item">
            <div className="item-main">
              <div className="item-top">
                <span className="item-desc">{inc.description}</span>
                <span className="item-amount">
                  {formatMoney(inc.amount, inc.currency)}
                </span>
              </div>
              <div className="item-meta">
                {inc.category && <span className="tag">{inc.category}</span>}
                {inc.is_recurring && <span className="tag tag-recur">Mensual</span>}
                <span className="item-date">{formatDateLocal(inc.income_date)}</span>
              </div>
            </div>

            {confirmDelete === inc.id ? (
              <div className="confirm">
                <span>¿Borrar?</span>
                <button
                  type="button"
                  className="btn-danger btn-small"
                  onClick={() => handleDelete(inc.id)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => setConfirmDelete(null)}
                >
                  No
                </button>
              </div>
            ) : (
              <div className="item-actions">
                <button type="button" className="btn-link" onClick={() => openEdit(inc)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-link btn-link-danger"
                  onClick={() => setConfirmDelete(inc.id)}
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
