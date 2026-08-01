import { useState, type FormEvent } from 'react'
import { parseMoney, todayLocal, type Currency } from '../lib/format'
import type { Account } from '../lib/types'
import { TARJETA } from './AccountForm'

export interface TransferFormValues {
  from_account: string
  to_account: string
  amount: number
  currency: Currency
  transfer_date: string
  notes: string | null
}

interface Props {
  cuentas: Account[]
  initialTo?: string
  onSubmit: (values: TransferFormValues) => Promise<void>
  onCancel: () => void
}

export function TransferForm({ cuentas, initialTo, onSubmit, onCancel }: Props) {
  const toInit = initialTo ? cuentas.find((c) => c.id === initialTo) : undefined
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>(initialTo ?? '')
  // Si venimos de "Pagar tarjeta", arrancamos filtrando por la moneda de esa tarjeta.
  const [currency, setCurrency] = useState<Currency>(toInit?.currency ?? 'ARS')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fromAcc = cuentas.find((c) => c.id === from)
  const effCurrency = fromAcc?.currency ?? currency
  const origenes = cuentas.filter((c) => c.currency === currency)
  const destinos = cuentas.filter((c) => c.currency === effCurrency && c.id !== from)
  const destinoAcc = cuentas.find((c) => c.id === to)
  const esPagoTarjeta = destinoAcc?.type === TARJETA

  function pickCurrency(c: Currency) {
    setCurrency(c)
    setFrom('')
    setTo('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!from) {
      setError('Elegí desde qué cuenta sale la plata.')
      return
    }
    if (!to) {
      setError('Elegí a qué cuenta va la plata.')
      return
    }
    if (from === to) {
      setError('Tienen que ser dos cuentas distintas.')
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
        from_account: from,
        to_account: to,
        amount: monto,
        currency: effCurrency,
        transfer_date: date,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card form">
      <h3 className="form-title">{esPagoTarjeta ? 'Pagar tarjeta' : 'Transferir entre cuentas'}</h3>

      <div className="field">
        <span className="field-label">Moneda</span>
        <div className="toggle">
          <button type="button" className={currency === 'ARS' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickCurrency('ARS')}>
            ARS $
          </button>
          <button type="button" className={currency === 'USD' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickCurrency('USD')}>
            USD u$s
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Desde (sale la plata)</span>
        {origenes.length === 0 ? (
          <span className="muted-inline">No tenés cuentas en {currency}.</span>
        ) : (
          <div className="chips">
            {origenes.map((c) => (
              <button type="button" key={c.id} className={from === c.id ? 'chip chip-active' : 'chip'} onClick={() => setFrom(from === c.id ? '' : c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">Hacia (entra la plata)</span>
        {destinos.length === 0 ? (
          <span className="muted-inline">Elegí primero desde dónde.</span>
        ) : (
          <div className="chips">
            {destinos.map((c) => (
              <button type="button" key={c.id} className={to === c.id ? 'chip chip-active' : 'chip'} onClick={() => setTo(to === c.id ? '' : c.id)}>
                {c.type === TARJETA ? `💳 ${c.name}` : c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="field">
        <span className="field-label">Monto</span>
        <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </label>

      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Nota (opcional)</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: pago resumen tarjeta" />
      </label>

      {esPagoTarjeta && (
        <div className="tip-inline">
          💳 Estás <b>pagando tu tarjeta</b>: baja la deuda y baja el saldo de la cuenta con la que
          pagás. No es un gasto nuevo. 👍
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
