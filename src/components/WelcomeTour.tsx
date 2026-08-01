import { useEffect, useState } from 'react'
import { useOnboarding } from '../lib/OnboardingContext'

interface Step {
  icon: string
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    icon: '🐷',
    title: '¡Hola! Soy Puggy',
    text: 'Te ayudo a ver tu plata clara, en pesos y en dólares, sin vueltas. Te muestro en un minuto cómo se usa. 👇',
  },
  {
    icon: '💳',
    title: '1. Tus cuentas',
    text: 'Empezá cargando tus cuentas: efectivo, banco, billetera virtual y tarjetas. Es la base para que todos los números cierren.',
  },
  {
    icon: '💰',
    title: '2. Tus ingresos',
    text: 'Anotá la plata que entra: sueldo, alquiler, ventas… Los que se repiten todos los meses los cargás una sola vez.',
  },
  {
    icon: '🧾',
    title: '3. Tus gastos',
    text: 'Anotá lo que gastás y con qué cuenta pagaste. Si pagás con tarjeta, se suma solo a la deuda de esa tarjeta.',
  },
  {
    icon: '↔️',
    title: 'Pagar la tarjeta',
    text: 'Cuando pagás el resumen, usá “Transferir” en Cuentas (no lo cargues como gasto otra vez). Así la compra no se cuenta doble.',
  },
  {
    icon: '📊',
    title: 'Tu panorama',
    text: 'En el Dashboard ves tu patrimonio (lo que tenés menos lo que debés), el balance del mes y a dónde se va la plata.',
  },
  {
    icon: '🎯',
    title: 'Metas e inversiones',
    text: 'Ponete objetivos de ahorro y seguí cómo van tus inversiones. Puggy te muestra si vas bien encaminado.',
  },
  {
    icon: '✅',
    title: '¡Listo para arrancar!',
    text: 'Eso es todo. Si querés volver a ver esta guía, tocá el botón “?” de arriba a la derecha cuando quieras. 🐷',
  },
]

export function WelcomeTour() {
  const { showTour, finishTour } = useOnboarding()
  const [i, setI] = useState(0)

  // Cada vez que se abre (incluido desde el botón "?"), arranca del principio.
  useEffect(() => {
    if (showTour) setI(0)
  }, [showTour])

  if (!showTour) return null

  const step = STEPS[i]
  const isFirst = i === 0
  const isLast = i === STEPS.length - 1

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true">
      <div className="tour-card">
        <div className="tour-icon">{step.icon}</div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-text">{step.text}</p>

        <div className="tour-dots">
          {STEPS.map((_, k) => (
            <span key={k} className={k === i ? 'tour-dot tour-dot-on' : 'tour-dot'} />
          ))}
        </div>

        <div className="tour-actions">
          {isLast ? (
            <span />
          ) : (
            <button type="button" className="tour-skip" onClick={finishTour}>
              Saltar
            </button>
          )}
          <div className="tour-nav">
            {!isFirst && (
              <button type="button" className="btn-secondary tour-btn" onClick={() => setI(i - 1)}>
                Atrás
              </button>
            )}
            <button
              type="button"
              className="btn-primary tour-btn"
              onClick={() => (isLast ? finishTour() : setI(i + 1))}
            >
              {isLast ? '¡Listo!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
