import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLocal, formatMoney, type Currency } from '../lib/format'
import type { Account, Income } from '../lib/types'
import { IncomeForm, MEDIOS_COBRO, type IncomeFormValues } from './IncomeForm'
import { TagManager } from './TagManager'
import { CoachMark } from './CoachMark'
import { isVoiceSupported, startVoice, type VoiceRec } from '../lib/voice'
import { parseVoice, type ParsedVoice } from '../lib/voiceParse'
import { VoiceListening } from './VoiceListening'

interface Props {
  incomes: Income[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  categorias: string[]
  fuentes: string[]
  onAddCategoria: (name: string) => Promise<void>
  onDeleteCategoria: (name: string) => Promise<void>
  onAddFuente: (name: string) => Promise<void>
  onDeleteFuente: (name: string) => Promise<void>
  cuentas: Account[]
  onSaved?: () => void
}

export function IncomesList({
  incomes,
  loading,
  error,
  reload,
  categorias,
  fuentes,
  onAddCategoria,
  onDeleteCategoria,
  onAddFuente,
  onDeleteFuente,
  cuentas,
  onSaved,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [newAsInitial, setNewAsInitial] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voice, setVoice] = useState<ParsedVoice | null>(null)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<VoiceRec | null>(null)

  const { flow, initial } = useMemo(() => {
    const flow: Record<Currency, number> = { ARS: 0, USD: 0 }
    const initial: Record<Currency, number> = { ARS: 0, USD: 0 }
    for (const i of incomes) {
      if (i.is_initial) initial[i.currency] += i.amount
      else flow[i.currency] += i.amount
    }
    return { flow, initial }
  }, [incomes])

  const hasInitial = initial.ARS > 0 || initial.USD > 0

  function openNew(asInitial: boolean) {
    setEditing(null)
    setVoice(null)
    setNewAsInitial(asInitial)
    setShowForm(true)
    setConfirmDelete(null)
  }

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
        setVoice(parseVoice(t, { categorias, fuentes, metodos: MEDIOS_COBRO, fallback: 'Ingreso' }))
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

  async function handleSubmit(values: IncomeFormValues) {
    const wasNew = !editing
    if (editing) {
      const { error } = await supabase.from('incomes').update(values).eq('id', editing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('incomes').insert(values)
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
    const { error } = await supabase.from('incomes').delete().eq('id', id)
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
          <span className="stat-label">Ingresos en pesos</span>
          <span className="stat-value">{formatMoney(flow.ARS, 'ARS')}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Ingresos en dólares</span>
          <span className="stat-value">{formatMoney(flow.USD, 'USD')}</span>
        </div>
      </div>

      {hasInitial && (
        <div className="card inv-summary">
          <span className="stat-label">Saldos iniciales (lo que ya tenías)</span>
          <div className="inv-rows">
            {initial.ARS > 0 && (
              <div className="inv-row">
                <span>En pesos</span>
                <span className="inv-val">{formatMoney(initial.ARS, 'ARS')}</span>
              </div>
            )}
            {initial.USD > 0 && (
              <div className="inv-row">
                <span>En dólares</span>
                <span className="inv-val">{formatMoney(initial.USD, 'USD')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <CoachMark
            tipKey="tip_ingresos"
            text="Anotá la plata que entra (sueldo, alquiler, ventas…). Lo que se repite todos los meses, marcalo como mensual."
          />
          <button type="button" className="btn-primary" onClick={() => openNew(false)}>
            + Agregar ingreso
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
            {showManage ? 'Cerrar gestión' : '⚙︎ Gestionar categorías y fuentes'}
          </button>
        </>
      )}

      {showManage && !showForm && (
        <div className="card manage-card">
          <TagManager title="Categorías" items={categorias} onAdd={onAddCategoria} onDelete={onDeleteCategoria} />
          <TagManager title="Fuentes de ingreso" items={fuentes} onAdd={onAddFuente} onDelete={onDeleteFuente} />
        </div>
      )}

      {showForm && (
        <>
          {voice && transcript && (
            <p className="voice-heard">🎤 Escuché: “{transcript}”. Revisá y guardá.</p>
          )}
          <IncomeForm
            title={
              voice
                ? 'Revisá el ingreso'
                : editing
                  ? editing.is_initial
                    ? 'Editar saldo inicial'
                    : 'Editar ingreso'
                  : newAsInitial
                    ? 'Nuevo saldo inicial'
                    : 'Nuevo ingreso'
            }
            submitLabel={editing ? 'Guardar cambios' : 'Guardar'}
            categorias={categorias}
            fuentes={fuentes}
            cuentas={cuentas}
            initial={
              editing ??
              (voice
                ? {
                    description: voice.description,
                    amount: voice.amount ?? undefined,
                    currency: voice.currency,
                    category: voice.category,
                    source: voice.source,
                    is_recurring: voice.is_recurring,
                    income_date: voice.date,
                    is_initial: false,
                  }
                : { is_initial: newAsInitial })
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
        <h3 className="list-title">Tus ingresos</h3>

        {loading && <p className="muted">Cargando…</p>}
        {error && <p className="error-msg">{error}</p>}
        {actionError && <p className="error-msg">{actionError}</p>}

        {!loading && !error && incomes.length === 0 && (
          <p className="muted">
            Todavía no cargaste nada. Tocá “+ Agregar ingreso” para registrar tu primer
            ingreso.
          </p>
        )}

        {incomes.map((inc) => (
          <div key={inc.id} className="card item">
            <div className="item-main">
              <div className="item-top">
                <span className="item-desc">{inc.description}</span>
                <span className="item-amount">{formatMoney(inc.amount, inc.currency)}</span>
              </div>
              <div className="item-meta">
                {inc.is_initial && <span className="tag tag-initial">Saldo inicial</span>}
                {inc.category && <span className="tag">{inc.category}</span>}
                {inc.source && <span className="tag tag-source">{inc.source}</span>}
                {inc.collection_method && <span className="tag tag-pay">{inc.collection_method}</span>}
                {inc.is_recurring && <span className="tag tag-recur">Mensual</span>}
                <span className="item-date">{formatDateLocal(inc.income_date)}</span>
              </div>
            </div>

            {confirmDelete === inc.id ? (
              <div className="confirm">
                <span>¿Borrar?</span>
                <button type="button" className="btn-danger btn-small" onClick={() => handleDelete(inc.id)}>
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
                    setEditing(inc)
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
                  onClick={() => setConfirmDelete(inc.id)}
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
