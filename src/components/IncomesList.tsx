import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney, type Currency } from '../lib/format'
import type { Income } from '../lib/types'
import { IncomeForm, type IncomeFormValues } from './IncomeForm'
import { TagManager } from './TagManager'

interface Props {
  incomes: Income[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  categorias: string[]
  fuentes: string[]
  onAddCategoria: (name: string) => Promise<void>
  onDeleteCategoria: (name: string) => Promise<void>
  onAddFuente: (name: string) => Promise<void>
  onDeleteFuente: (name: string) => Promise<void>
}

export function IncomesList({
  incomes,
  loading,
  error,
  reload,
  categorias,
  fuentes,
  onAddCategoria,
  onDeleteCategoria,
  onAddFuente,
  onDeleteFuente,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [newAsInitial, setNewAsInitial] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const { flow, initial } = useMemo(() => {
    const flow: Record<Currency, number> = { ARS: 0, USD: 0 }
    const initial: Record<Currency, number> = { ARS: 0, USD: 0 }
    for (const i of incomes) {
      if (i.is_initial) initial[i.currency] += i.amount
      else flow[i.currency] += i.amount
    }
    return { flow, initial }
  }, [incomes])

  const hasInitial = initial.ARS > 0 || initial.USD > 0

  function openNew(asInitial: boolean) {
    setEditing(null)
    setNewAsInitial(asInitial)
    setShowForm(true)
    setConfirmDelete(null)
  }

  async function handleSubmit(values: IncomeFormValues) {
    if (editing) {
      const { error } = await supabase.from('incomes').update(values).eq('id', editing.id)
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
          <span className="stat-label">Ingresos en pesos</span>
          <span className="stat-value">{formatMoney(flow.ARS, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Ingresos en dólares</span>
          <span className="stat-value">{formatMoney(flow.USD, 'USD')}</span>
        </div>
      </div>

      {hasInitial && (
        <div className="card inv-summary">
          <span className="stat-label">Saldos iniciales (lo que ya tenías)</span>
          <div className="inv-rows">
            {initial.ARS > 0 && (
              <div className="inv-row">
                <span>En pesos</span>
                <span className="inv-val">{formatMoney(initial.ARS, 'ARS')}</span>
              </div>
            )}
            {initial.USD > 0 && (
              <div className="inv-row">
                <span>En dólares</span>
                <span className="inv-val">{formatMoney(initial.USD, 'USD')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <div className="btn-pair">
            <button type="button" className="btn-primary" onClick={() => openNew(false)}>
              + Agregar ingreso
            </button>
            <button type="button" className="btn-secondary" onClick={() => openNew(true)}>
              + Saldo inicial
            </button>
          </div>
          <button
            type="button"
            className="btn-link manage-link"
            onClick={() => setShowManage((v) => !v)}
          >
            {showManage ? 'Cerrar gestión' : '⚙︎ Gestionar categorías y fuentes'}
          </button>
        </>
      )}

      {showManage && !showForm && (
        <div className="card manage-card">
          <TagManager title="Categorías" items={categorias} onAdd={onAddCategoria} onDelete={onDeleteCategoria} />
          <TagManager title="Fuentes de ingreso" items={fuentes} onAdd={onAddFuente} onDelete={onDeleteFuente} />
        </div>
      )}

      {showForm && (
        <IncomeForm
          title={
            editing
              ? editing.is_initial
                ? 'Editar saldo inicial'
                : 'Editar ingreso'
              : newAsInitial
                ? 'Nuevo saldo inicial'
                : 'Nuevo ingreso'
          }
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          categorias={categorias}
          fuentes={fuentes}
          initial={editing ?? { is_initial: newAsInitial }}
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
            Todavía no cargaste nada. Tocá “+ Agregar ingreso”, o “+ Saldo inicial” para
            registrar lo que ya tenés hoy.
          </p>
        )}

        {incomes.map((inc) => (
          <div key={inc.id} className="card item">
            <div className="item-main">
              <div className="item-top">
                <span className="item-desc">{inc.description}</span>
                <span className="item-amount">{formatMoney(inc.amount, inc.currency)}</span>
              </div>
              <div className="item-meta">
                {inc.is_initial && <span className="tag tag-initial">Saldo inicial</span>}
                {inc.category && <span className="tag">{inc.category}</span>}
                {inc.source && <span className="tag tag-source">{inc.source}</span>}
                {inc.collection_method && <span className="tag tag-pay">{inc.collection_method}</span>}
                {inc.is_recurring && <span className="tag tag-recur">Mensual</span>}
                <span className="item-date">{formatDateLocal(inc.income_date)}</span>
              </div>
            </div>

            {confirmDelete === inc.id ? (
              <div className="confirm">
                <span>¿Borrar?</span>
                <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(inc.id)}>
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
                    setEditing(inc)
                    setShowForm(true)
                    setConfirmDelete(null)
                  }}
                >
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
