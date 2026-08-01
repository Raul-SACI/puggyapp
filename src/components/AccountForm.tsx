import { useState, type FormEvent } from 'react'
import { parseMoney, type Currency } from '../lib/format'

export const TIPOS_CUENTA = ['Efectivo', 'Banco', 'Billetera virtual', 'Tarjeta de crédito', 'Otro']

export const TARJETA = 'Tarjeta de crédito'

export interface AccountFormValues {
  name: string
  type: string
  currency: Currency
  opening_balance: number
}

interface Initial {
  name?: string
  type?: string
  currency?: Currency
  opening_balance?: number
}

interface Props {
  title: string
  submitLabel: string
  initial?: Initial
  onSubmit: (values: AccountFormValues) => Promise<void>
  onCancel: () => void
}

export function AccountForm({ title, submitLabel, initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'Efectivo')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [balance, setBalance] = useState(
    initial?.opening_balance != null ? String(initial.opening_balance).replace('.', ',') : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const esTarjeta = type === TARJETA

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const nm = name.trim()
    if (!nm) {
      setError('Poné un nombre (ej: "Banco Galicia").')
      return
    }
    let bal = 0
    if (balance.trim()) {
      const b = parseMoney(balance)
      if (b === null) {
        setError('El saldo no es un número válido.')
        return
      }
      bal = b
    }
    setSaving(true)
    try {
      await onSubmit({ name: nm, type, currency, opening_balance: bal })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card form">
      <h3 className="form-title">{title}</h3>

      <label className="field">
        <span className="field-label">Nombre de la cuenta</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Ej: "Efectivo", "Banco Galicia", "Mercado Pago"'
          required
        />
      </label>

      <div className="field">
        <span className="field-label">Tipo</span>
        <div className="chips">
          {TIPOS_CUENTA.map((t) => (
            <button
              type="button"
              key={t}
              className={type === t ? 'chip chip-active' : 'chip'}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Moneda</span>
        <div className="toggle">
          <button type="button" className={currency === 'ARS' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => setCurrency('ARS')}>
            ARS $
          </button>
          <button type="button" className={currency === 'USD' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => setCurrency('USD')}>
            USD u$s
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">
          {esTarjeta ? 'Deuda actual (lo que debés hoy)' : 'Saldo inicial (lo que tenés hoy)'}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0"
        />
      </label>

      {esTarjeta && (
        <div className="tip-inline">
          💳 En la tarjeta, este número es tu <b>deuda</b>. Las compras la suman; cuando la pagás
          (con una transferencia), baja.
        </div>
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
