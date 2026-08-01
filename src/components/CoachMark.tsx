import { useOnboarding } from '../lib/OnboardingContext'

interface Props {
  /** Clave única del globito (se guarda en tu cuenta cuando lo cerrás). */
  tipKey: string
  /** Texto del globito. */
  text: string
  /** 'down' muestra una flechita apuntando al botón de abajo. */
  arrow?: 'down' | 'none'
}

/**
 * Globito de ayuda que aparece la primera vez que entrás a una sección,
 * apuntando al botón clave. Se cierra con "Entendido" y no vuelve a salir.
 */
export function CoachMark({ tipKey, text, arrow = 'down' }: Props) {
  const { ready, tipsSeen, markTipSeen } = useOnboarding()

  if (!ready || tipsSeen[tipKey]) return null

  return (
    <div className="coach">
      <div className="coach-bubble">
        <span className="coach-emoji">💡</span>
        <div className="coach-body">
          <span className="coach-text">{text}</span>
          <button type="button" className="coach-ok" onClick={() => markTipSeen(tipKey)}>
            Entendido 👍
          </button>
        </div>
      </div>
      {arrow === 'down' && <span className="coach-arrow" />}
    </div>
  )
}
