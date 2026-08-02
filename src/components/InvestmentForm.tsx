import { useEffect, useState, type FormEvent } from 'react'
import { parseMoney, todayLocal, type Currency } from '../lib/format'
import type { Account } from '../lib/types'
import { PRESTAMO_ACTIVO, isDebtType } from '../lib/balances'

export const TIPOS_INVERSION = [
  'Plazo fijo',
  'Dólares',
  'Acciones',
  'Cripto',
  'Propiedad',
  'Bonos',
  'Otro',
]

export interface InvestmentFormValues {
  name: string
  type: string | null
  amount_invested: number
  current_value: number | null
  currency: Currency
  account_id: string | null
  invested_at: string
  notes: string | null
}

interface Initial {
  name?: string
  type?: string | null
  amount_invested?: number
  current_value?: number | null
  currency?: Currency
  account_id?: string | null
  invested_at?: string
  notes?: string | null
}

interface Props {
  title: string
  submitLabel: string
  initial?: Initial
  cuentas: Account[]
  onSubmit: (values: InvestmentFormValues) => Promise<void>
  onCancel: () => void
}

export function InvestmentForm({ title, submitLabel, initial, cuentas, onSubmit, onCancel }: Props) {
  const initType = initial?.type ?? ''
  const presetMatch = TIPOS_INVERSION.includes(initType)

  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<string>(initType ? (presetMatch ? initType : 'Otro') : '')
  const [customType, setCustomType] = useState(initType && !presetMatch ? initType : '')
  const [invested, setInvested] = useState(
    initial?.amount_invested != null ? String(initial.amount_invested).replace('.', ',') : '',
  )
  const [current, setCurrent] = useState(
    initial?.current_value != null ? String(initial.current_value).replace('.', ',') : '',
  )
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [accountId, setAccountId] = useState<string>(initial?.account_id ?? '')
  const [date, setDate] = useState(initial?.invested_at ?? todayLocal())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Cuentas desde donde puede salir la plata: líquidas y de la misma moneda.
  const cuentasOrigen = cuentas.filter(
    (c) => c.currency === currency && !isDebtType(c.type) && c.type !== PRESTAMO_ACTIVO,
  )

  // Si cambia la moneda y la cuenta elegida ya no coincide, la deseleccionamos.
  useEffect(() => {
    const acc = cuentas.find((x) => x.id === accountId)
    if (acc && acc.currency !== currency) setAccountId('')
  }, [currency, accountId, cuentas])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const nm = name.trim()
    if (!nm) {
      setError('Poné un nombre (ej: "Plazo fijo Galicia").')
      return
    }
    const inv = parseMoney(invested)
    if (inv === null || inv <= 0) {
      setError('El monto invertido tiene que ser un número mayor a cero.')
      return
    }
    if (!accountId) {
      setError('Elegí de qué cuenta salió la plata para invertir.')
      return
    }
    let cur: number | null = null
    if (current.trim()) {
      cur = parseMoney(current)
      if (cur === null) {
        setError('El valor actual no es un número válido.')
        return
      }
    }
    const tp = type === 'Otro' ? customType.trim() || 'Otro' : type || null

    setSaving(true)
    try {
      await onSubmit({
        name: nm,
        type: tp,
        amount_invested: inv,
        current_value: cur,
        currency,
        account_id: accountId || null,
        invested_at: date,
        notes: notes.trim() || null,
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
        <span className="field-label">Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Ej: "Plazo fijo Galicia"'
          required
        />
      </label>

      <div className="field">
        <span className="field-label">Tipo</span>
        <div className="chips">
          {TIPOS_INVERSION.map((t) => (
            <button
              type="button"
              key={t}
              className={type === t ? 'chip chip-active' : 'chip'}
              onClick={() => setType(type === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>
        {type === 'Otro' && (
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Escribí el tipo (opcional)"
            className="custom-cat"
          />
        )}
      </div>

      <div className="field">
        <span className="field-label">Monto invertido y moneda</span>
        <div className="amount-row">
          <input
            type="text"
            inputMode="decimal"
            value={invested}
            onChange={(e) => setInvested(e.target.value)}
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
        <span className="field-label">¿De qué cuenta salió la plata?</span>
        {cuentasOrigen.length === 0 ? (
          <span className="muted-inline">
            Creá una cuenta ({currency}) en la pestaña 💳 Cuentas para poder invertir.
          </span>
        ) : (
          <div className="chips">
            {cuentasOrigen.map((c) => (
              <button
                type="button"
                key={c.id}
                className={accountId === c.id ? 'chip chip-active' : 'chip'}
                onClick={() => setAccountId(accountId === c.id ? '' : c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <span className="muted-inline">Esa cuenta va a bajar su saldo por el monto invertido.</span>
      </div>

      <label className="field">
        <span className="field-label">Valor actual (opcional)</span>
        <input
          type="text"
          inputMode="decimal"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Cuánto vale hoy (dejalo vacío si no sabés)"
        />
      </label>

      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Nota (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Algún detalle que quieras recordar"
          rows={2}
          className="textarea"
        />
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
