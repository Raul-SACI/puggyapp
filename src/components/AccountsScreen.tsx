import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney, type Currency } from '../lib/format'
import type { Account } from '../lib/types'
import { AccountForm, TARJETA, type AccountFormValues } from './AccountForm'

function tipoIcon(type: string): string {
  if (type === 'Efectivo') return '💵'
  if (type === 'Banco') return '🏦'
  if (type === 'Billetera virtual') return '📱'
  if (type === TARJETA) return '💳'
  return '👛'
}

export function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
      .range(0, 999)
    if (error) setError(error.message)
    else setAccounts((data ?? []) as Account[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const totals = useMemo(() => {
    const have: Record<Currency, number> = { ARS: 0, USD: 0 }
    const owe: Record<Currency, number> = { ARS: 0, USD: 0 }
    for (const a of accounts) {
      if (a.type === TARJETA) owe[a.currency] += a.opening_balance
      else have[a.currency] += a.opening_balance
    }
    return { have, owe }
  }, [accounts])

  async function handleSubmit(values: AccountFormValues) {
    if (editing) {
      const { error } = await supabase.from('accounts').update(values).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('accounts').insert(values)
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  const currencies: Currency[] = (['ARS', 'USD'] as Currency[]).filter(
    (c) => totals.have[c] !== 0 || totals.owe[c] !== 0,
  )

  return (
    <div className="screen">
      {currencies.map((c) => (
        <div key={c} className="card inv-summary">
          <span className="stat-label">Resumen en {c === 'ARS' ? 'pesos' : 'dólares'}</span>
          <div className="inv-rows">
            <div className="inv-row">
              <span>Tenés</span>
              <span className="inv-val rend-up">{formatMoney(totals.have[c], c)}</span>
            </div>
            {totals.owe[c] > 0 && (
              <div className="inv-row">
                <span>Debés (tarjetas)</span>
                <span className="inv-val rend-down">{formatMoney(totals.owe[c], c)}</span>
              </div>
            )}
          </div>
        </div>
      ))}

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
          + Nueva cuenta
        </button>
      )}

      {showForm && (
        <AccountForm
          title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="list">
        <h3 className="list-title">Tus cuentas</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && accounts.length === 0 && (
          <p className="muted">
            Todavía no tenés cuentas. Tocá “+ Nueva cuenta” para agregar tu efectivo, banco,
            billetera o tarjeta.
          </p>
        )}

        {accounts.map((a) => {
          const esTarjeta = a.type === TARJETA
          return (
            <div key={a.id} className="card item">
              <div className="item-main">
                <div className="item-top">
                  <span className="item-desc">
                    {tipoIcon(a.type)} {a.name}
                  </span>
                  <span className={esTarjeta ? 'item-amount rend-down' : 'item-amount rend-up'}>
                    {formatMoney(a.opening_balance, a.currency)}
                  </span>
                </div>
                <div className="item-meta">
                  <span className="tag">{a.type}</span>
                  <span className="tag tag-pay">{a.currency}</span>
                  {esTarjeta && <span className="muted-inline">deuda</span>}
                </div>
              </div>

              {confirmDelete === a.id ? (
                <div className="confirm">
                  <span>¿Borrar?</span>
                  <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(a.id)}>
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
                      setEditing(a)
                      setShowForm(true)
                      setConfirmDelete(null)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-link btn-link-danger"
                    onClick={() => setConfirmDelete(a.id)}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {accounts.length > 0 && (
          <p className="muted" style={{ marginTop: '6px' }}>
            Por ahora el saldo es el que cargaste. En el próximo paso se va a actualizar solo
            con tus ingresos, gastos y transferencias. 🐷
          </p>
        )}
      </div>
    </div>
  )
}
