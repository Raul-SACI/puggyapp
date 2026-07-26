import { useState, type FormEvent } from 'react'
import { parseMoney, type Currency } from '../lib/format'

export interface GoalFormValues {
  name: string
  target_amount: number
  current_amount: number
  currency: Currency
  target_date: string | null
}

interface Initial {
  name?: string
  target_amount?: number
  current_amount?: number
  currency?: Currency
  target_date?: string | null
}

interface Props {
  title: string
  submitLabel: string
  initial?: Initial
  onSubmit: (values: GoalFormValues) => Promise<void>
  onCancel: () => void
}

export function GoalForm({ title, submitLabel, initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(
    initial?.target_amount != null ? String(initial.target_amount).replace('.', ',') : '',
  )
  const [current, setCurrent] = useState(
    initial?.current_amount ? String(initial.current_amount).replace('.', ',') : '',
  )
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [date, setDate] = useState(initial?.target_date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const nm = name.trim()
    if (!nm) {
      setError('Poné un nombre (ej: "Vacaciones").')
      return
    }
    const tgt = parseMoney(target)
    if (tgt === null || tgt <= 0) {
      setError('La meta tiene que ser un número mayor a cero.')
      return
    }
    let cur = 0
    if (current.trim()) {
      const c = parseMoney(current)
      if (c === null) {
        setError('Lo ya ahorrado no es un número válido.')
        return
      }
      cur = c
    }

    setSaving(true)
    try {
      await onSubmit({
        name: nm,
        target_amount: tgt,
        current_amount: cur,
        currency,
        target_date: date || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card form">
      <h3 className="form-title">{title}</h3>

      <label className="field">
        <span className="field-label">Nombre del objetivo</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Ej: "Vacaciones", "Auto", "Terreno"'
          required
        />
      </label>

      <div className="field">
        <span className="field-label">Meta y moneda</span>
        <div className="amount-row">
          <input
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
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

      <label className="field">
        <span className="field-label">Ya ahorrado (opcional)</span>
        <input
          type="text"
          inputMode="decimal"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="0"
        />
      </label>

      <label className="field">
        <span className="field-label">Fecha objetivo (opcional)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
