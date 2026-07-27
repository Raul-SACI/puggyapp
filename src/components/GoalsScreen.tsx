import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCallback, useEffect } from 'react'
import {
  formatDateLocal,
  formatMoney,
  parseMoney,
  todayLocal,
  ymd,
} from '../lib/format'
import type { SavingsGoal } from '../lib/types'
import { GoalForm, type GoalFormValues } from './GoalForm'

/** Texto de ayuda: cuánto ahorrar por mes para llegar a la meta. */
function planHint(goal: SavingsGoal): { text: string; tone: 'ok' | 'warn' | 'done' } {
  const falta = goal.target_amount - goal.current_amount
  if (falta <= 0) return { text: '¡Meta cumplida! 🎉', tone: 'done' }
  if (!goal.target_date) {
    return { text: `Te falta ${formatMoney(falta, goal.currency)}`, tone: 'ok' }
  }
  const h = ymd(todayLocal())
  const t = ymd(goal.target_date)
  const past =
    t.y < h.y || (t.y === h.y && (t.m < h.m || (t.m === h.m && t.d < h.d)))
  if (past) {
    return {
      text: `Meta vencida (${formatDateLocal(goal.target_date)}). Te falta ${formatMoney(
        falta,
        goal.currency,
      )}`,
      tone: 'warn',
    }
  }
  let months = (t.y - h.y) * 12 + (t.m - h.m)
  if (months <= 0) months = 1
  const perMonth = falta / months
  return {
    text: `Ahorrá ${formatMoney(perMonth, goal.currency)}/mes para llegar en ${formatDateLocal(
      goal.target_date,
    )}`,
    tone: 'ok',
  }
}

export function GoalsScreen() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [aporteFor, setAporteFor] = useState<string | null>(null)
  const [aporteInput, setAporteInput] = useState('')
  const [actionError, setActionError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 999)
    if (error) setError(error.message)
    else setGoals((data ?? []) as SavingsGoal[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleSubmit(values: GoalFormValues) {
    if (editing) {
      const { error } = await supabase.from('savings_goals').update(values).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('savings_goals').insert(values)
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  async function handleAporte(goal: SavingsGoal) {
    setActionError('')
    const monto = parseMoney(aporteInput)
    if (monto === null || monto === 0) {
      setActionError('Poné un monto válido para el aporte.')
      return
    }
    const nuevo = Math.max(0, goal.current_amount + monto)
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: nuevo })
      .eq('id', goal.id)
    if (error) setActionError(error.message)
    else {
      setAporteFor(null)
      setAporteInput('')
      await reload()
    }
  }

  return (
    <div className="screen">
      {!showForm && (
        <button
          type="button"
          className="btn-primary btn-pink"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
            setConfirmDelete(null)
            setAporteFor(null)
          }}
        >
          + Nuevo objetivo
        </button>
      )}

      {showForm && (
        <GoalForm
          title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
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
        <h3 className="list-title">Tus objetivos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && goals.length === 0 && (
          <p className="muted">
            Todavía no tenés objetivos. Tocá “+ Nuevo objetivo” para empezar a ahorrar
            con una meta.
          </p>
        )}

        {goals.map((g) => {
          const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
          const shownPct = Math.min(pct, 100)
          const hint = planHint(g)
          return (
            <div key={g.id} className="card item">
              <div className="item-main">
                <div className="item-top">
                  <span className="item-desc">{g.name}</span>
                  <span className="item-amount">{Math.round(pct)}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className={pct >= 100 ? 'progress-fill progress-done' : 'progress-fill'}
                    style={{ width: `${Math.max(shownPct, 2)}%` }}
                  />
                </div>

                <div className="goal-amounts">
                  {formatMoney(g.current_amount, g.currency)} de{' '}
                  {formatMoney(g.target_amount, g.currency)}
                </div>

                <div className={`goal-hint goal-hint-${hint.tone}`}>{hint.text}</div>
              </div>

              {aporteFor === g.id ? (
                <div className="aporte-row">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={aporteInput}
                    onChange={(e) => setAporteInput(e.target.value)}
                    placeholder="Monto del aporte"
                    className="amount-input"
                  />
                  <button type="button" className="btn-primary btn-small" onClick={() => handleAporte(g)}>
                    Sumar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setAporteFor(null)
                      setAporteInput('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : confirmDelete === g.id ? (
                <div className="confirm">
                  <span>¿Borrar?</span>
                  <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(g.id)}>
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
                      setAporteFor(g.id)
                      setAporteInput('')
                      setConfirmDelete(null)
                    }}
                  >
                    + Aporte
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setEditing(g)
                      setShowForm(true)
                      setConfirmDelete(null)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-link btn-link-danger"
                    onClick={() => setConfirmDelete(g.id)}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
