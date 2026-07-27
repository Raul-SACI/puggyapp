import { useEffect } from 'react'

interface Props {
  kind: 'in' | 'out'
  onDone: () => void
}

/** Animación divertida que aparece al guardar un ingreso (feliz, entran monedas)
 *  o un gasto (triste, se escapan monedas). Se cierra sola. */
export function SaveCelebration({ kind, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const coins = [0, 1, 2]

  return (
    <div className="celebrate-overlay">
      <div className="celebrate-box">
        <div className="celebrate-stage">
          {coins.map((i) => (
            <span
              key={i}
              className={kind === 'in' ? 'coin coin-in' : 'coin coin-out'}
              style={
                kind === 'in'
                  ? { left: `${58 + i * 18}px`, animationDelay: `${i * 0.18}s` }
                  : ({ left: `${58 + i * 18}px`, animationDelay: `${i * 0.12}s`, '--dx': `${(i - 1) * 46}px` } as React.CSSProperties)
              }
            >
              $
            </span>
          ))}

          <svg viewBox="0 0 64 64" className="celebrate-pig" xmlns="http://www.w3.org/2000/svg">
            {/* Base del chanchito */}
            <path d="M13 27 Q17 14 26 25 Z" fill="#ef94b4" />
            <path d="M51 27 Q47 14 38 25 Z" fill="#ef94b4" />
            <ellipse cx="32" cy="40" rx="23" ry="19" fill="#f7a8c4" />
            <rect x="26" y="21" width="12" height="3" rx="1.5" fill="#c76a90" />
            <ellipse cx="32" cy="49" rx="8" ry="6" fill="#ef94b4" />
            <ellipse cx="29" cy="49" rx="1.1" ry="2" fill="#c76a90" />
            <ellipse cx="35" cy="49" rx="1.1" ry="2" fill="#c76a90" />

            {kind === 'in' ? (
              <>
                {/* Ojitos felices + cachetes */}
                <path d="M19 37 Q24 32 29 37" fill="none" stroke="#3b2b33" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M35 37 Q40 32 45 37" fill="none" stroke="#3b2b33" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="17.5" cy="43" r="3" fill="#f2789f" opacity="0.55" />
                <circle cx="46.5" cy="43" r="3" fill="#f2789f" opacity="0.55" />
              </>
            ) : (
              <>
                {/* Ojitos tristes + cejas + lagrimita */}
                <ellipse cx="24" cy="38" rx="4" ry="4.6" fill="#ffffff" />
                <circle cx="24" cy="39.6" r="2.2" fill="#3b2b33" />
                <ellipse cx="40" cy="38" rx="4" ry="4.6" fill="#ffffff" />
                <circle cx="40" cy="39.6" r="2.2" fill="#3b2b33" />
                <path d="M18 32 L28 34" stroke="#3b2b33" strokeWidth="2" strokeLinecap="round" />
                <path d="M46 32 L36 34" stroke="#3b2b33" strokeWidth="2" strokeLinecap="round" />
                <path d="M29 43 Q29 48 26.5 49 Q24 48 24 44.5 Q26 42.5 29 43 Z" fill="#7dd3fc" />
              </>
            )}
          </svg>
        </div>
        <span className="celebrate-text">
          {kind === 'in' ? 'Ingresó Dinero 🐷' : 'Fuga de Dinero 💸'}
        </span>
      </div>
    </div>
  )
}
