import { useState, type FormEvent } from 'react'
import { parseMoney, formatMoney, todayLocal, type Currency } from '../lib/format'
import type { Account } from '../lib/types'
import { isDebtType, TARJETA_TYPE } from '../lib/balances'

export interface TransferFormValues {
  from_account: string
  to_account: string
  amount: number
  currency: Currency
  to_amount: number | null
  to_currency: Currency | null
  transfer_date: string
  notes: string | null
}

interface Props {
  cuentas: Account[]
  initialTo?: string
  onSubmit: (values: TransferFormValues) => Promise<void>
  onCancel: () => void
}

type Flow = 'transfer' | 'fx'

export function TransferForm({ cuentas, initialTo, onSubmit, onCancel }: Props) {
  const toInit = initialTo ? cuentas.find((c) => c.id === initialTo) : undefined
  // Pagar tarjeta/préstamo es siempre misma moneda: no mostramos el cambio.
  const lockTransfer = Boolean(initialTo)

  const [flow, setFlow] = useState<Flow>('transfer')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>(initialTo ?? '')
  // Transferencia misma moneda: filtramos por la moneda de esa tarjeta si venimos de "Pagar".
  const [currency, setCurrency] = useState<Currency>(toInit?.currency ?? 'ARS')
  const [amount, setAmount] = useState('')
  // Cambio de moneda:
  const [fxDir, setFxDir] = useState<'buy' | 'sell'>('buy') // buy = comprar dólares (ARS→USD)
  const [toAmount, setToAmount] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Transferencia misma moneda ---
  const fromAcc = cuentas.find((c) => c.id === from)
  const effCurrency = fromAcc?.currency ?? currency
  const origenes = cuentas.filter((c) => c.currency === currency)
  const destinos = cuentas.filter((c) => c.currency === effCurrency && c.id !== from)
  const destinoAcc = cuentas.find((c) => c.id === to)
  const esPagoDeuda = destinoAcc ? isDebtType(destinoAcc.type) : false
  const esPagoTarjeta = destinoAcc?.type === TARJETA_TYPE

  // --- Cambio de moneda ---
  const fxFrom: Currency = fxDir === 'buy' ? 'ARS' : 'USD'
  const fxTo: Currency = fxDir === 'buy' ? 'USD' : 'ARS'
  const fxOrigenes = cuentas.filter((c) => c.currency === fxFrom)
  const fxDestinos = cuentas.filter((c) => c.currency === fxTo)
  const aSale = parseMoney(amount)
  const aEntra = parseMoney(toAmount)
  // Tipo de cambio en pesos por dólar (sirva comprar o vender).
  const arsVal = fxDir === 'buy' ? aSale : aEntra
  const usdVal = fxDir === 'buy' ? aEntra : aSale
  const rate = arsVal && usdVal && usdVal > 0 ? arsVal / usdVal : null

  function pickCurrency(c: Currency) {
    setCurrency(c)
    setFrom('')
    setTo('')
  }

  function pickFlow(f: Flow) {
    setFlow(f)
    setFrom('')
    setTo('')
    setAmount('')
    setToAmount('')
    setError('')
  }

  function pickFxDir(d: 'buy' | 'sell') {
    setFxDir(d)
    setFrom('')
    setTo('')
    setAmount('')
    setToAmount('')
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

    if (flow === 'fx') {
      const sale = parseMoney(amount)
      if (sale === null || sale <= 0) {
        setError(`El monto que sale (${fxFrom}) tiene que ser mayor a cero.`)
        return
      }
      const entra = parseMoney(toAmount)
      if (entra === null || entra <= 0) {
        setError(`El monto que entra (${fxTo}) tiene que ser mayor a cero.`)
        return
      }
      setSaving(true)
      try {
        await onSubmit({
          from_account: from,
          to_account: to,
          amount: sale,
          currency: fxFrom,
          to_amount: entra,
          to_currency: fxTo,
          transfer_date: date,
          notes: notes.trim() || null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.')
        setSaving(false)
      }
      return
    }

    // Transferencia misma moneda
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
        to_amount: null,
        to_currency: null,
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
      <h3 className="form-title">
        {flow === 'fx'
          ? 'Cambio de moneda'
          : esPagoDeuda
            ? esPagoTarjeta
              ? 'Pagar tarjeta'
              : 'Pagar préstamo'
            : 'Transferir entre cuentas'}
      </h3>

      {!lockTransfer && (
        <div className="field">
          <span className="field-label">¿Qué querés hacer?</span>
          <div className="toggle">
            <button type="button" className={flow === 'transfer' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickFlow('transfer')}>
              ↔ Transferir
            </button>
            <button type="button" className={flow === 'fx' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickFlow('fx')}>
              💱 Cambio de moneda
            </button>
          </div>
        </div>
      )}

      {flow === 'transfer' ? (
        <>
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
                    {isDebtType(c.type) ? `${c.type === TARJETA_TYPE ? '💳' : '💸'} ${c.name}` : c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="field">
            <span className="field-label">Monto</span>
            <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </label>
        </>
      ) : (
        <>
          <div className="field">
            <span className="field-label">¿Qué operación es?</span>
            <div className="toggle">
              <button type="button" className={fxDir === 'buy' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickFxDir('buy')}>
                Comprar US$
              </button>
              <button type="button" className={fxDir === 'sell' ? 'toggle-btn toggle-on' : 'toggle-btn'} onClick={() => pickFxDir('sell')}>
                Vender US$
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Desde (sale {fxFrom})</span>
            {fxOrigenes.length === 0 ? (
              <span className="muted-inline">No tenés cuentas en {fxFrom}.</span>
            ) : (
              <div className="chips">
                {fxOrigenes.map((c) => (
                  <button type="button" key={c.id} className={from === c.id ? 'chip chip-active' : 'chip'} onClick={() => setFrom(from === c.id ? '' : c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <span className="field-label">Hacia (entra {fxTo})</span>
            {fxDestinos.length === 0 ? (
              <span className="muted-inline">No tenés cuentas en {fxTo}. Creá una primero.</span>
            ) : (
              <div className="chips">
                {fxDestinos.map((c) => (
                  <button type="button" key={c.id} className={to === c.id ? 'chip chip-active' : 'chip'} onClick={() => setTo(to === c.id ? '' : c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="field">
            <span className="field-label">Pagás (sale en {fxFrom})</span>
            <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </label>

          <label className="field">
            <span className="field-label">Recibís (entra en {fxTo})</span>
            <input type="text" inputMode="decimal" value={toAmount} onChange={(e) => setToAmount(e.target.value)} placeholder="0" />
          </label>

          {rate !== null && (
            <div className="tip-inline">
              💱 Tipo de cambio: <b>{formatMoney(rate, 'ARS')}</b> por dólar.
            </div>
          )}
        </>
      )}

      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Nota (opcional)</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={flow === 'fx' ? 'Ej: compré dólares en el banco' : 'Ej: pago resumen tarjeta'} />
      </label>

      {flow === 'transfer' && esPagoDeuda && (
        <div className="tip-inline">
          {esPagoTarjeta ? '💳' : '💸'} Estás{' '}
          <b>{esPagoTarjeta ? 'pagando tu tarjeta' : 'pagando tu préstamo'}</b>: baja la deuda y baja
          el saldo de la cuenta con la que pagás. No es un gasto nuevo. 👍
        </div>
      )}

      {flow === 'fx' && (
        <div className="tip-inline">
          💱 No es un gasto ni un ingreso: solo pasás plata de una moneda a otra. Baja tu saldo en{' '}
          {fxFrom} y sube tu saldo en {fxTo}.
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
