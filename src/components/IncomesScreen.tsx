import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import {
  formatDateLocal,
  formatMoney,
  parseMoney,
  todayLocal,
  type Currency,
} from '../lib/format'

interface Income {
  id: string
  description: string
  amount: number
  currency: Currency
  category: string | null
  is_recurring: boolean
  income_date: string
  created_at: string
}

const CATEGORIAS = [
  'Sueldo',
  'Dividendos ARG',
  'Alquiler',
  'Venta de Inmuebles',
  'Venta de Rodados',
  'Dividendos EEUU',
  'Aguinaldo',
  'Venta de Servicio',
  'Rendimientos',
  'Otro',
]

export function IncomesScreen() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Estado del formulario
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [category, setCategory] = useState<string>('')
  const [customCategory, setCustomCategory] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [date, setDate] = useState(todayLocal())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadIncomes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    // .range(0, 999): Supabase corta en 1000 filas; paginamos cuando haga falta.
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .order('income_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, 999)
    if (error) {
      setLoadError(error.message)
    } else {
      setIncomes((data ?? []) as Income[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadIncomes()
  }, [loadIncomes])

  const totals = useMemo(() => {
    let ars = 0
    let usd = 0
    for (const i of incomes) {
      if (i.currency === 'ARS') ars += i.amount
      else usd += i.amount
    }
    return { ars, usd }
  }, [incomes])

  function resetForm() {
    setEditingId(null)
    setDescription('')
    setAmount('')
    setCurrency('ARS')
    setCategory('')
    setCustomCategory('')
    setIsRecurring(false)
    setDate(todayLocal())
    setFormError('')
  }

  function openNew() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(inc: Income) {
    setEditingId(inc.id)
    setDescription(inc.description)
    setAmount(String(inc.amount).replace('.', ','))
    setCurrency(inc.currency)
    if (inc.category && CATEGORIAS.includes(inc.category)) {
      setCategory(inc.category)
      setCustomCategory('')
    } else if (inc.category) {
      setCategory('Otro')
      setCustomCategory(inc.category)
    } else {
      setCategory('')
      setCustomCategory('')
    }
    setIsRecurring(inc.is_recurring)
    setDate(inc.income_date)
    setFormError('')
    setShowForm(true)
    setConfirmDelete(null)
  }

  function cancelForm() {
    setShowForm(false)
    resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const desc = description.trim()
    if (!desc) {
      setFormError('Poné una descripción (ej: "Sueldo julio").')
      return
    }
    const monto = parseMoney(amount)
    if (monto === null || monto <= 0) {
      setFormError('El monto tiene que ser un número mayor a cero.')
      return
    }
    const cat =
      category === 'Otro'
        ? customCategory.trim() || null
        : category || null

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('incomes')
          .update({
            description: desc,
            amount: monto,
            currency,
            category: cat,
            is_recurring: isRecurring,
            income_date: date,
          })
          .eq('id', editingId)
        if (error) throw error
      } else {
        // user_id lo completa sola la base (default auth.uid()).
        const { error } = await supabase.from('incomes').insert({
          description: desc,
          amount: monto,
          currency,
          category: cat,
          is_recurring: isRecurring,
          income_date: date,
        })
        if (error) throw error
      }
      setShowForm(false)
      resetForm()
      await loadIncomes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) {
      setLoadError(error.message)
    } else {
      setConfirmDelete(null)
      await loadIncomes()
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
        <form onSubmit={handleSubmit} className="card form">
          <h3 className="form-title">
            {editingId ? 'Editar ingreso' : 'Nuevo ingreso'}
          </h3>

          <label className="field">
            <span className="field-label">Descripción</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ej: "Sueldo julio"'
              required
            />
          </label>

          <div className="field">
            <span className="field-label">Monto y moneda</span>
            <div className="amount-row">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="amount-input"
              />
              <div className="toggle">
                <button
                  type="button"
                  className={currency === 'ARS' ? 'toggle-btn toggle-on' : 'toggle-btn'}
                  onClick={() => setCurrency('ARS')}
                >
                  ARS $
                </button>
                <button
                  type="button"
                  className={currency === 'USD' ? 'toggle-btn toggle-on' : 'toggle-btn'}
                  onClick={() => setCurrency('USD')}
                >
                  USD u$s
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Categoría</span>
            <div className="chips">
              {CATEGORIAS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={category === c ? 'chip chip-active' : 'chip'}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {category === 'Otro' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Escribí la categoría"
                className="custom-cat"
              />
            )}
          </div>

          <label className="field">
            <span className="field-label">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <span>Se repite todos los meses (ej: sueldo, alquiler)</span>
          </label>

          {formError && <p className="error-msg">{formError}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={cancelForm}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="list">
        <h3 className="list-title">Tus ingresos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {loadError && <p className="error-msg">{loadError}</p>}

        {!loading && !loadError && incomes.length === 0 && (
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
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => openEdit(inc)}
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
