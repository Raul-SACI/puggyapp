import { useState } from 'react'

interface Props {
  title: string
  items: string[]
  onAdd: (name: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
}

export function TagManager({ title, items, onAdd, onDelete }: Props) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const n = input.trim()
    if (!n) return
    setBusy(true)
    try {
      await onAdd(n)
      setInput('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="manage-block">
      <span className="field-label">{title}</span>
      <div className="chips">
        {items.map((it) => (
          <span key={it} className="chip chip-manage">
            {it}
            <button
              type="button"
              className="chip-x"
              onClick={() => onDelete(it)}
              aria-label={`Eliminar ${it}`}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="muted-inline">No hay todavía.</span>}
      </div>
      <div className="amount-row">
        <input
          className="amount-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Agregar nueva…"
        />
        <button type="button" className="btn-secondary btn-small" disabled={busy} onClick={add}>
          Agregar
        </button>
      </div>
    </div>
  )
}
