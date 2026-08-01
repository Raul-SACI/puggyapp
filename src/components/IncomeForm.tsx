import { useState, type FormEvent } from 'react'
import { parseMoney, todayLocal, type Currency } from '../lib/format'
import type { Account } from '../lib/types'

export const MEDIOS_COBRO = [
  'Efectivo',
  'Transferencia',
  'Billetera virtual',
  'Cheque',
  'Otros',
]

export interface IncomeFormValues {
  description: string
  amount: number
  currency: Currency
  category: string | null
  source: string | null
  collection_method: string | null
  account_id: string | null
  is_initial: boolean
  is_recurring: boolean
  income_date: string
}

interface Initial {
  description?: string
  amount?: number
  currency?: Currency
  category?: string | null
  source?: string | null
  account_id?: string | null
  is_initial?: boolean
  is_recurring?: boolean
  income_date?: string
}

interface Props {
  title: string
  submitLabel: string
  categorias: string[]
  fuentes: string[]
  cuentas: Account[]
  initial?: Initial
  showRecurring?: boolean
  showInitial?: boolean
  onSubmit: (values: IncomeFormValues) => Promise<void>
  onCancel: () => void
}

function withInitial(list: string[], value?: string | null): string[] {
  if (value && !list.includes(value)) return [value, ...list]
  return list
}

export function IncomeForm({
  title,
  submitLabel,
  categorias,
  fuentes,
  cuentas,
  initial,
  showRecurring = true,
  showInitial = true,
  onSubmit,
  onCancel,
}: Props) {
  const cats = withInitial(categorias, initial?.category)
  const srcs = withInitial(fuentes, initial?.source)

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount).replace('.', ',') : '',
  )
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'ARS')
  const [category, setCategory] = useState<string>(initial?.category ?? '')
  const [source, setSource] = useState<string>(initial?.source ?? '')
  const [accountId, setAccountId] = useState<string>(initial?.account_id ?? '')
  const [isInitial, setIsInitial] = useState(initial?.is_initial ?? false)
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false)
  const [date, setDate] = useState(initial?.income_date ?? todayLocal())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cuentasMoneda = cuentas.filter((c) => c.currency === currency)

  function pickCurrency(c: Currency) {
    setCurrency(c)
    // Si la cuenta elegida ya no coincide con la moneda, la deseleccionamos.
    const acc = cuentas.find((x) => x.id === accountId)
    if (acc && acc.currency !== c) setAccountId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const desc = description.trim()
    if (!desc) {
      setError('Poné una descripción (ej: "Sueldo julio" o "Saldo en banco").')
      return
    }
    const monto = parseMoney(amount)
    if (monto === null || monto <= 0) {
      setError('El monto tiene que ser un número mayor a cero.')
      return
    }
    const acc = cuentas.find((c) => c.id === accountId) ?? null

    setSaving(true)
    try {
      await onSubmit({
        description: desc,
        amount: monto,
        currency,
        category: category || null,
        source: source || null,
        collection_method: acc?.name ?? null,
        account_id: isInitial ? null : accountId || null,
        is_initial: isInitial,
        is_recurring: isInitial ? false : isRecurring,
        income_date: date,
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
          placeholder={isInitial ? 'Ej: "Saldo en banco"' : 'Ej: "Sueldo julio"'}
          required
        />
      </label>

      <div className="field">
        <span className="field-label">{isInitial ? 'Saldo y moneda' : 'Monto y moneda'}</span>
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
            <button type="button" className={currency === 'ARS' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickCurrency('ARS')}>
              ARS $
            </button>
            <button type="button" className={currency === 'USD' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickCurrency('USD')}>
              USD u$s
            </button>
          </div>
        </div>
      </div>

      {!isInitial && (
        <div className="field">
          <span className="field-label">¿A qué cuenta entra?</span>
          {cuentasMoneda.length === 0 ? (
            <span className="muted-inline">Creá una cuenta ({currency}) en la pestaña 💳 Cuentas.</span>
          ) : (
            <div className="chips">
              {cuentasMoneda.map((c) => (
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
        </div>
      )}

      {!isInitial && (
        <>
          <div className="field">
            <span className="field-label">Categoría</span>
            {cats.length === 0 ? (
              <span className="muted-inline">Agregá categorías desde “Gestionar”.</span>
            ) : (
              <div className="chips">
                {cats.map((c) => (
                  <button type="button" key={c} className={category === c ? 'chip chip-active' : 'chip'} onClick={() => setCategory(category === c ? '' : c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <span className="field-label">Fuente de ingreso</span>
            {srcs.length === 0 ? (
              <span className="muted-inline">Agregá fuentes desde “Gestionar”.</span>
            ) : (
              <div className="chips">
                {srcs.map((s) => (
                  <button type="button" key={s} className={source === s ? 'chip chip-active' : 'chip'} onClick={() => setSource(source === s ? '' : s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {showInitial && (
        <label className="check-row">
          <input type="checkbox" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} />
          <span>Es un saldo inicial (lo que ya tenés hoy, no un ingreso del mes)</span>
        </label>
      )}

      {showRecurring && !isInitial && (
        <label className="check-row">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          <span>Se repite todos los meses (ej: sueldo, alquiler)</span>
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
