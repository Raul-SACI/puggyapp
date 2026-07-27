import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import {
  daysBetween,
  formatDateLocal,
  formatMoney,
  parseMoney,
  todayLocal,
  type Currency,
} from '../lib/format'
import type { Reminder } from '../lib/types'

type Kind = 'cobro' | 'pago'

interface ViewProps {
  kind: Kind
}

interface FormValues {
  title: string
  amount: number | null
  currency: Currency
  due_date: string
  notes: string | null
}

const LABELS = {
  cobro: {
    titulo: 'Recordatorios de cobro',
    nuevo: 'Nuevo recordatorio de cobro',
    agregar: '+ Agregar recordatorio',
    placeholder: 'Ej: "Cobrar a Cliente Acme"',
    hecho: 'Cobrado',
    vacio: 'No tenés recordatorios de cobro. Agregá uno para no olvidarte de cobrar.',
  },
  pago: {
    titulo: 'Recordatorios de pago',
    nuevo: 'Nuevo recordatorio de pago',
    agregar: '+ Agregar recordatorio',
    placeholder: 'Ej: "Pagar alquiler"',
    hecho: 'Pagado',
    vacio: 'No tenés recordatorios de pago. Agregá uno para no olvidarte de pagar.',
  },
}

function estado(dueISO: string): { texto: string; cls: string } {
  const dias = daysBetween(todayLocal(), dueISO)
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`, cls: 'rem-overdue' }
  if (dias === 0) return { texto: 'Vence hoy', cls: 'rem-today' }
  if (dias === 1) return { texto: 'Vence mañana', cls: 'rem-soon' }
  return { texto: `Vence en ${dias} días`, cls: 'rem-soon' }
}

function ReminderForm({
  kind,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  kind: Kind
  initial?: Reminder
  submitLabel: string
  onSubmit: (v: FormValues) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount).replace('.', ',') : '',
  )
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [date, setDate] = useState(initial?.due_date ?? todayLocal())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const t = title.trim()
    if (!t) {
      setError('Poné una descripción.')
      return
    }
    let monto: number | null = null
    if (amount.trim()) {
      monto = parseMoney(amount)
      if (monto === null) {
        setError('El monto no es válido (dejalo vacío si no aplica).')
        return
      }
    }
    setSaving(true)
    try {
      await onSubmit({
        title: t,
        amount: monto,
        currency,
        due_date: date,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card form">
      <h3 className="form-title">{initial ? 'Editar recordatorio' : LABELS[kind].nuevo}</h3>

      <label className="field">
        <span className="field-label">Descripción</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={LABELS[kind].placeholder}
          required
        />
      </label>

      <div className="field">
        <span className="field-label">Monto (opcional) y moneda</span>
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
            <button type="button" className={currency === 'ARS' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => setCurrency('ARS')}>
              ARS $
            </button>
            <button type="button" className={currency === 'USD' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => setCurrency('USD')}>
              USD u$s
            </button>
          </div>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Fecha de vencimiento</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Nota (opcional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="textarea" placeholder="Algún detalle" />
      </label>

      {error && <p className="error-msg">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export function RemindersView({ kind }: ViewProps) {
  const [items, setItems] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('kind', kind)
      .order('due_date', { ascending: true })
      .range(0, 999)
    if (error) setError(error.message)
    else setItems((data ?? []) as Reminder[])
    setLoading(false)
  }, [kind])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleSubmit(v: FormValues) {
    if (editing) {
      const { error } = await supabase.from('reminders').update(v).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('reminders').insert({ ...v, kind })
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function toggleDone(r: Reminder) {
    setActionError('')
    const { error } = await supabase.from('reminders').update({ done: !r.done }).eq('id', r.id)
    if (error) setActionError(error.message)
    else await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  const pending = items.filter((r) => !r.done)
  const done = items.filter((r) => r.done)
  const L = LABELS[kind]

  function row(r: Reminder) {
    const st = r.done ? null : estado(r.due_date)
    return (
      <div key={r.id} className={r.done ? 'card item rem-done-card' : 'card item'}>
        <div className="item-main">
          <div className="item-top">
            <span className="item-desc">{r.title}</span>
            {r.amount != null && (
              <span className="item-amount">{formatMoney(r.amount, r.currency ?? 'ARS')}</span>
            )}
          </div>
          <div className="item-meta">
            {st && <span className={`rem-badge ${st.cls}`}>{st.texto}</span>}
            <span className="item-date">{formatDateLocal(r.due_date)}</span>
          </div>
          {r.notes && <div className="inv-note">{r.notes}</div>}
        </div>

        {confirmDelete === r.id ? (
          <div className="confirm">
            <span>¿Borrar?</span>
            <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(r.id)}>
              Sí
            </button>
            <button type="button" className="btn-secondary btn-small" onClick={() => setConfirmDelete(null)}>
              No
            </button>
          </div>
        ) : (
          <div className="item-actions">
            <button type="button" className="btn-link" onClick={() => toggleDone(r)}>
              {r.done ? 'Reactivar' : `Marcar ${L.hecho.toLowerCase()}`}
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setEditing(r)
                setShowForm(true)
                setConfirmDelete(null)
              }}
            >
              Editar
            </button>
            <button type="button" className="btn-link btn-link-danger" onClick={() => setConfirmDelete(r.id)}>
              Borrar
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="screen">
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
          {L.agregar}
        </button>
      )}

      {showForm && (
        <ReminderForm
          kind={kind}
          initial={editing ?? undefined}
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="list">
        <h3 className="list-title">{L.titulo}</h3>
        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && items.length === 0 && <p className="muted">{L.vacio}</p>}

        {pending.map(row)}

        {done.length > 0 && (
          <>
            <h3 className="list-title">Hechos</h3>
            {done.map(row)}
          </>
        )}
      </div>
    </div>
  )
}
