import { useState, type FormEvent } from 'react'
import { parseMoney, todayLocal, type Currency } from '../lib/format'

export const MEDIOS_PAGO = [
  'Efectivo',
  'Tarjeta de crédito',
  'Transferencia/QR',
  'Débito',
  'Otros',
]

export interface ExpenseFormValues {
  description: string
  amount: number
  currency: Currency
  category: string | null
  payment_method: string | null
  is_recurring: boolean
  date: string
}

interface Initial {
  description?: string
  amount?: number
  currency?: Currency
  category?: string | null
  payment_method?: string | null
  is_recurring?: boolean
  date?: string
}

interface Props {
  title: string
  submitLabel: string
  categorias: string[]
  initial?: Initial
  showRecurring?: boolean
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  onCancel: () => void
}

function withInitial(list: string[], value?: string | null): string[] {
  if (value && !list.includes(value)) return [value, ...list]
  return list
}

export function ExpenseForm({
  title,
  submitLabel,
  categorias,
  initial,
  showRecurring = true,
  onSubmit,
  onCancel,
}: Props) {
  const cats = withInitial(categorias, initial?.category)

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount).replace('.', ',') : '',
  )
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [category, setCategory] = useState<string>(initial?.category ?? '')
  const [payment, setPayment] = useState<string>(initial?.payment_method ?? '')
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false)
  const [date, setDate] = useState(initial?.date ?? todayLocal())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const desc = description.trim()
    if (!desc) {
      setError('Poné una descripción (ej: "Supermercado").')
      return
    }
    const monto = parseMoney(amount)
    if (monto === null || monto <= 0) {
      setError('El monto tiene que ser un número mayor a cero.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        description: desc,
        amount: monto,
        currency,
        category: category || null,
        payment_method: payment || null,
        is_recurring: isRecurring,
        date,
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
        <span className="field-label">Descripción</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Ej: "Supermercado"'
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
        {cats.length === 0 ? (
          <span className="muted-inline">Agregá categorías desde “Gestionar”.</span>
        ) : (
          <div className="chips">
            {cats.map((c) => (
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
        )}
      </div>

      <div className="field">
        <span className="field-label">Medio de pago</span>
        <div className="chips">
          {MEDIOS_PAGO.map((p) => (
            <button
              type="button"
              key={p}
              className={payment === p ? 'chip chip-active' : 'chip'}
              onClick={() => setPayment(payment === p ? '' : p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {showRecurring && (
        <label className="check-row">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          <span>Se repite todos los meses (ej: alquiler, servicios)</span>
        </label>
      )}

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
