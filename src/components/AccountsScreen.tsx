import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney, type Currency } from '../lib/format'
import {
  accountBalances,
  isDebtType,
  PRESTAMO_ACTIVO,
  PRESTAMO_DEUDA,
  TARJETA_TYPE,
} from '../lib/balances'
import type { MovItem, MovOverride } from '../lib/movements'
import type {
  Account,
  Expense,
  ExpenseOverride,
  Income,
  IncomeOverride,
  Investment,
  Transfer,
} from '../lib/types'
import { AccountForm, type AccountFormValues } from './AccountForm'
import { TransferForm, type TransferFormValues } from './TransferForm'
import { CoachMark } from './CoachMark'

function tipoIcon(type: string): string {
  if (type === 'Efectivo') return '💵'
  if (type === 'Banco') return '🏦'
  if (type === 'Billetera virtual') return '📱'
  if (type === TARJETA_TYPE) return '💳'
  if (type === PRESTAMO_DEUDA) return '💸'
  if (type === PRESTAMO_ACTIVO) return '🤝'
  return '👛'
}

type Mode = 'none' | 'account' | 'transfer'

export function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [incomeOv, setIncomeOv] = useState<IncomeOverride[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseOv, setExpenseOv] = useState<ExpenseOverride[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<Mode>('none')
  const [editing, setEditing] = useState<Account | null>(null)
  const [transferTo, setTransferTo] = useState<string | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDelTr, setConfirmDelTr] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const [acc, inc, incOv, exp, expOv, tr, invs] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }).range(0, 999),
      supabase.from('incomes').select('*').range(0, 999),
      supabase.from('income_overrides').select('*').range(0, 999),
      supabase.from('expenses').select('*').range(0, 999),
      supabase.from('expense_overrides').select('*').range(0, 999),
      supabase.from('transfers').select('*').order('transfer_date', { ascending: false }).range(0, 999),
      supabase.from('investments').select('*').range(0, 999),
    ])
    if (acc.error) setError(acc.error.message)
    else setAccounts((acc.data ?? []) as Account[])
    setIncomes(inc.error ? [] : ((inc.data ?? []) as Income[]))
    setIncomeOv(incOv.error ? [] : ((incOv.data ?? []) as IncomeOverride[]))
    setExpenses(exp.error ? [] : ((exp.data ?? []) as Expense[]))
    setExpenseOv(expOv.error ? [] : ((expOv.data ?? []) as ExpenseOverride[]))
    setTransfers(tr.error ? [] : ((tr.data ?? []) as Transfer[]))
    setInvestments(invs.error ? [] : ((invs.data ?? []) as Investment[]))
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const balances = useMemo(() => {
    const expItems: MovItem[] = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      payment_method: e.payment_method,
      account_id: e.account_id,
      is_recurring: e.is_recurring,
      date: e.expense_date,
    }))
    const expOverrides: MovOverride[] = expenseOv.map((o) => ({
      ref_id: o.expense_id,
      period: o.period,
      status: o.status,
      description: o.description,
      amount: o.amount,
      currency: o.currency,
      category: o.category,
      payment_method: o.payment_method,
      override_date: o.override_date,
    }))
    return accountBalances(accounts, incomes, incomeOv, expItems, expOverrides, transfers, investments)
  }, [accounts, incomes, incomeOv, expenses, expenseOv, transfers, investments])

  const totals = useMemo(() => {
    const have: Record<Currency, number> = { ARS: 0, USD: 0 }
    const owe: Record<Currency, number> = { ARS: 0, USD: 0 }
    for (const a of accounts) {
      const bal = balances.get(a.id) ?? a.opening_balance
      if (isDebtType(a.type)) owe[a.currency] += bal
      else have[a.currency] += bal
    }
    return { have, owe }
  }, [accounts, balances])

  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  async function handleAccountSubmit(values: AccountFormValues) {
    if (editing) {
      const { error } = await supabase.from('accounts').update(values).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('accounts').insert(values)
      if (error) throw error
    }
    setMode('none')
    setEditing(null)
    await reload()
  }

  async function handleTransferSubmit(values: TransferFormValues) {
    const { error } = await supabase.from('transfers').insert(values)
    if (error) throw error
    setMode('none')
    setTransferTo(undefined)
    await reload()
  }

  async function handleDeleteAccount(id: string) {
    setActionError('')
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  async function handleDeleteTransfer(id: string) {
    setActionError('')
    const { error } = await supabase.from('transfers').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelTr(null)
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
                <span>Debés (tarjetas y préstamos)</span>
                <span className="inv-val rend-down">{formatMoney(totals.owe[c], c)}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {mode === 'none' && (
        <>
        <CoachMark
          tipKey="tip_cuentas"
          text="Empezá por acá: cargá tu efectivo, banco, billetera o tarjeta. Es la base para que los números cierren."
        />
        <div className="btn-pair">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null)
              setMode('account')
              setConfirmDelete(null)
            }}
          >
            + Nueva cuenta
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setTransferTo(undefined)
              setMode('transfer')
            }}
          >
            ↔ Transferir
          </button>
        </div>
        </>
      )}

      {mode === 'account' && (
        <AccountForm
          title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
          submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
          initial={editing ?? undefined}
          onSubmit={handleAccountSubmit}
          onCancel={() => {
            setMode('none')
            setEditing(null)
          }}
        />
      )}

      {mode === 'transfer' && (
        <TransferForm
          cuentas={accounts}
          initialTo={transferTo}
          onSubmit={handleTransferSubmit}
          onCancel={() => {
            setMode('none')
            setTransferTo(undefined)
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
          const esDeuda = isDebtType(a.type)
          const bal = balances.get(a.id) ?? a.opening_balance
          return (
            <div key={a.id} className="card item">
              <div className="item-main">
                <div className="item-top">
                  <span className="item-desc">
                    {tipoIcon(a.type)} {a.name}
                  </span>
                  <span className={esDeuda ? 'item-amount rend-down' : 'item-amount rend-up'}>
                    {formatMoney(bal, a.currency)}
                  </span>
                </div>
                <div className="item-meta">
                  <span className="tag">{a.type}</span>
                  <span className="tag tag-pay">{a.currency}</span>
                  {esDeuda && <span className="muted-inline">deuda</span>}
                  {a.type === PRESTAMO_ACTIVO && <span className="muted-inline">te deben</span>}
                </div>
              </div>

              {confirmDelete === a.id ? (
                <div className="confirm">
                  <span>¿Borrar?</span>
                  <button type="button" className="btn-danger btn-small" onClick={() => handleDeleteAccount(a.id)}>
                    Sí
                  </button>
                  <button type="button" className="btn-secondary btn-small" onClick={() => setConfirmDelete(null)}>
                    No
                  </button>
                </div>
              ) : (
                <div className="item-actions">
                  {esDeuda && bal > 0 && mode === 'none' && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setTransferTo(a.id)
                        setMode('transfer')
                      }}
                    >
                      Pagar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setEditing(a)
                      setMode('account')
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
      </div>

      {transfers.length > 0 && (
        <div className="list">
          <h3 className="list-title">Movimientos entre cuentas</h3>
          {transfers.map((t) => {
            const destinoTipo = accounts.find((a) => a.id === t.to_account)?.type ?? ''
            const esPago = isDebtType(destinoTipo)
            const pagoLabel = destinoTipo === TARJETA_TYPE ? 'Pago de tarjeta' : 'Pago de préstamo'
            const esCambio = t.to_amount != null && t.to_currency != null
            return (
              <div key={t.id} className="card item">
                <div className="item-main">
                  <div className="item-top">
                    <span className="item-desc">
                      {esCambio ? '💱 ' : ''}
                      {accName(t.from_account)} → {esPago ? `${tipoIcon(destinoTipo)} ` : ''}
                      {accName(t.to_account)}
                    </span>
                    <span className="item-amount">
                      {esCambio
                        ? `${formatMoney(t.amount, t.currency)} → ${formatMoney(t.to_amount as number, t.to_currency as Currency)}`
                        : formatMoney(t.amount, t.currency)}
                    </span>
                  </div>
                  <div className="item-meta">
                    {esPago && <span className="tag tag-recur">{pagoLabel}</span>}
                    {esCambio && <span className="tag tag-pay">Cambio de moneda</span>}
                    <span className="item-date">{formatDateLocal(t.transfer_date)}</span>
                    {t.notes && <span className="muted-inline">· {t.notes}</span>}
                  </div>
                </div>
                {confirmDelTr === t.id ? (
                  <div className="confirm">
                    <span>¿Borrar?</span>
                    <button type="button" className="btn-danger btn-small" onClick={() => handleDeleteTransfer(t.id)}>
                      Sí
                    </button>
                    <button type="button" className="btn-secondary btn-small" onClick={() => setConfirmDelTr(null)}>
                      No
                    </button>
                  </div>
                ) : (
                  <div className="item-actions">
                    <button type="button" className="btn-link btn-link-danger" onClick={() => setConfirmDelTr(t.id)}>
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
