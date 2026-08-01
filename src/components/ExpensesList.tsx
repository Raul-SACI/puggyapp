import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney } from '../lib/format'
import type { MovItem } from '../lib/movements'
import type { Account } from '../lib/types'
import { ExpenseForm, MEDIOS_PAGO, type ExpenseFormValues } from './ExpenseForm'
import { TagManager } from './TagManager'
import { isVoiceSupported, startVoice, type VoiceRec } from '../lib/voice'
import { parseVoice, type ParsedVoice } from '../lib/voiceParse'
import { VoiceListening } from './VoiceListening'

interface Props {
  items: MovItem[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  categorias: string[]
  onAddCategoria: (name: string) => Promise<void>
  onDeleteCategoria: (name: string) => Promise<void>
  cuentas: Account[]
  onSaved?: () => void
}

function toRow(v: ExpenseFormValues) {
  return {
    description: v.description,
    amount: v.amount,
    currency: v.currency,
    category: v.category,
    payment_method: v.payment_method,
    account_id: v.account_id,
    is_recurring: v.is_recurring,
    expense_date: v.date,
  }
}

export function ExpensesList({
  items,
  loading,
  error,
  reload,
  categorias,
  onAddCategoria,
  onDeleteCategoria,
  cuentas,
  onSaved,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MovItem | null>(null)
  const [showManage, setShowManage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voice, setVoice] = useState<ParsedVoice | null>(null)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<VoiceRec | null>(null)

  function startVoiceFlow() {
    setVoiceError('')
    if (!isVoiceSupported()) {
      setVoiceError('Tu navegador no soporta dictado por voz. Probá en Chrome (Android).')
      return
    }
    setListening(true)
    recRef.current = startVoice(
      (t) => {
        setTranscript(t)
        setVoice(parseVoice(t, { categorias, metodos: MEDIOS_PAGO, fallback: 'Gasto' }))
        setEditing(null)
        setShowForm(true)
        setListening(false)
      },
      (m) => {
        setListening(false)
        setVoiceError(
          m === 'no-support'
            ? 'Tu navegador no soporta dictado por voz. Probá en Chrome (Android).'
            : m === 'not-allowed' || m === 'service-not-allowed'
              ? 'Necesito permiso para usar el micrófono.'
              : 'No te escuché bien, probá de nuevo.',
        )
      },
      () => setListening(false),
    )
  }

  function cancelVoice() {
    recRef.current?.abort()
    recRef.current = null
    setListening(false)
  }

  const totals = useMemo(() => {
    let ars = 0
    let usd = 0
    for (const i of items) {
      if (i.currency === 'ARS') ars += i.amount
      else usd += i.amount
    }
    return { ars, usd }
  }, [items])

  async function handleSubmit(values: ExpenseFormValues) {
    const wasNew = !editing
    if (editing) {
      const { error } = await supabase.from('expenses').update(toRow(values)).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('expenses').insert(toRow(values))
      if (error) throw error
    }
    setShowForm(false)
    setEditing(null)
    setVoice(null)
    setTranscript('')
    await reload()
    if (wasNew) onSaved?.()
  }

  async function handleDelete(id: string) {
    setActionError('')
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) setActionError(error.message)
    else {
      setConfirmDelete(null)
      await reload()
    }
  }

  return (
    <div className="screen">
      {listening && <VoiceListening onCancel={cancelVoice} />}
      <div className="stat-row">
        <div className="card stat">
          <span className="stat-label">Gastos en pesos</span>
          <span className="stat-value">{formatMoney(totals.ars, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Gastos en dólares</span>
          <span className="stat-value">{formatMoney(totals.usd, 'USD')}</span>
        </div>
      </div>

      {!showForm && (
        <>
          <button
            type="button"
            className="btn-primary btn-red"
            onClick={() => {
              setEditing(null)
              setVoice(null)
              setShowForm(true)
              setConfirmDelete(null)
            }}
          >
            + Agregar gasto
          </button>

          <button
            type="button"
            className={listening ? 'btn-voice listening' : 'btn-voice'}
            onClick={startVoiceFlow}
            disabled={listening}
          >
            {listening ? '🎤 Escuchando… hablá ahora' : '🎤 Cargar por voz'}
          </button>
          {voiceError && <p className="error-msg">{voiceError}</p>}

          <button
            type="button"
            className="btn-link manage-link"
            onClick={() => setShowManage((v) => !v)}
          >
            {showManage ? 'Cerrar gestión' : '⚙︎ Gestionar categorías'}
          </button>
        </>
      )}

      {showManage && !showForm && (
        <div className="card manage-card">
          <TagManager title="Categorías de gastos" items={categorias} onAdd={onAddCategoria} onDelete={onDeleteCategoria} />
        </div>
      )}

      {showForm && (
        <>
          {voice && transcript && (
            <p className="voice-heard">🎤 Escuché: “{transcript}”. Revisá y guardá.</p>
          )}
          <ExpenseForm
            title={voice ? 'Revisá el gasto' : editing ? 'Editar gasto' : 'Nuevo gasto'}
            submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
            categorias={categorias}
            cuentas={cuentas}
            initial={
              editing ??
              (voice
                ? {
                    description: voice.description,
                    amount: voice.amount ?? undefined,
                    currency: voice.currency,
                    category: voice.category,
                    is_recurring: voice.is_recurring,
                    date: voice.date,
                  }
                : undefined)
            }
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
              setVoice(null)
              setTranscript('')
            }}
          />
        </>
      )}

      <div className="list">
        <h3 className="list-title">Tus gastos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">
            Todavía no cargaste gastos. Tocá “+ Agregar gasto” para empezar.
          </p>
        )}

        {items.map((it) => (
          <div key={it.id} className="card item">
            <div className="item-main">
              <div className="item-top">
                <span className="item-desc">{it.description}</span>
                <span className="item-amount">{formatMoney(it.amount, it.currency)}</span>
              </div>
              <div className="item-meta">
                {it.category && <span className="tag">{it.category}</span>}
                {it.payment_method && <span className="tag tag-pay">{it.payment_method}</span>}
                {it.is_recurring && <span className="tag tag-recur">Mensual</span>}
                <span className="item-date">{formatDateLocal(it.date)}</span>
              </div>
            </div>

            {confirmDelete === it.id ? (
              <div className="confirm">
                <span>¿Borrar?</span>
                <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(it.id)}>
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
                    setEditing(it)
                    setVoice(null)
                    setShowForm(true)
                    setConfirmDelete(null)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-link btn-link-danger"
                  onClick={() => setConfirmDelete(it.id)}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
