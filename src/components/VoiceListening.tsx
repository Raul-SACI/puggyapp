interface Props {
  onCancel?: () => void
}

/** Overlay a pantalla completa (gris difuminado) mientras se está grabando por voz. */
export function VoiceListening({ onCancel }: Props) {
  return (
    <div className="voice-overlay">
      <div className="voice-panel">
        <div className="mic-wrap">
          <span className="mic-ring" />
          <span className="mic-ring d2" />
          <span className="mic-circle">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="#ffffff" />
              <path d="M6 11 a6 6 0 0 0 12 0" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <span className="voice-title">Escuchando…</span>
        <span className="voice-sub">Hablá ahora 🎤</span>
        {onCancel && (
          <button type="button" className="voice-cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
