interface Props {
  variant: 'coins' | 'sad' | 'invest'
  size?: number
}

/**
 * Chanchito animado del encabezado, que cambia según el módulo:
 *  - coins:  contento, con una moneda entrando (Ingresos / general)
 *  - sad:    triste, con una moneda que se escapa (Gastos)
 *  - invest: con anteojos y pensamientos numéricos (Inversiones)
 */
export function PiggyMascot({ variant, size = 40 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Puggy"
    >
      {/* Base del chanchito */}
      <g className="piggy-body">
        <path d="M13 27 Q17 14 26 25 Z" fill="#ef94b4" />
        <path d="M51 27 Q47 14 38 25 Z" fill="#ef94b4" />
        <ellipse cx="32" cy="40" rx="21" ry="18" fill="#f7a8c4" />
        <rect x="26" y="22" width="12" height="3" rx="1.5" fill="#c76a90" />

        {variant === 'sad' ? (
          <>
            <ellipse cx="24" cy="38" rx="3.6" ry="4" fill="#ffffff" />
            <circle cx="24" cy="39.2" r="2" fill="#3b2b33" />
            <ellipse cx="40" cy="38" rx="3.6" ry="4" fill="#ffffff" />
            <circle cx="40" cy="39.2" r="2" fill="#3b2b33" />
            <path d="M19 33 L27 35" stroke="#3b2b33" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M45 33 L37 35" stroke="#3b2b33" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M28 43 Q28 46.5 26 47.5 Q24 46.5 24 44 Q26 42 28 43 Z" fill="#7dd3fc" />
          </>
        ) : (
          <>
            <ellipse cx="24" cy="37" rx="4.3" ry="5.1" fill="#ffffff" />
            <circle cx="24.8" cy="35.4" r="2.4" fill="#5b3a29" />
            <ellipse cx="40" cy="37" rx="4.3" ry="5.1" fill="#ffffff" />
            <circle cx="40.8" cy="35.4" r="2.4" fill="#5b3a29" />
          </>
        )}

        {/* hocico */}
        <ellipse cx="32" cy="48" rx="8" ry="6" fill="#ef94b4" />
        <ellipse cx="29" cy="48" rx="1.1" ry="2" fill="#c76a90" />
        <ellipse cx="35" cy="48" rx="1.1" ry="2" fill="#c76a90" />

        {/* anteojos (inversiones) */}
        {variant === 'invest' && (
          <>
            <circle cx="24" cy="37" r="7.5" fill="none" stroke="#334155" strokeWidth="1.8" />
            <circle cx="40" cy="37" r="7.5" fill="none" stroke="#334155" strokeWidth="1.8" />
            <line x1="31.5" y1="37" x2="32.5" y2="37" stroke="#334155" strokeWidth="1.8" />
            <line x1="16.5" y1="36" x2="12" y2="34" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="47.5" y1="36" x2="52" y2="34" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M20 34 L23 34" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          </>
        )}
      </g>

      {/* Moneda que entra (coins) */}
      {variant === 'coins' && (
        <g>
          <circle cx="32" cy="9" r="4.6" fill="#fcd34d" stroke="#eab308" strokeWidth="1.2" />
          <text x="32" y="11.6" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#a16207" fontFamily="system-ui, sans-serif">$</text>
          <animateTransform attributeName="transform" attributeType="XML" type="translate" values="0 0; 0 14; 0 14" keyTimes="0; 0.55; 1" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.35 0 0.85 1; 0 0 1 1" />
          <animate attributeName="opacity" values="0; 1; 1; 0; 0" keyTimes="0; 0.08; 0.5; 0.62; 1" dur="2.6s" repeatCount="indefinite" />
        </g>
      )}

      {/* Moneda que se escapa (sad) */}
      {variant === 'sad' && (
        <g>
          <circle cx="32" cy="24" r="4.6" fill="#fcd34d" stroke="#eab308" strokeWidth="1.2" />
          <text x="32" y="26.6" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#a16207" fontFamily="system-ui, sans-serif">$</text>
          <animateTransform attributeName="transform" attributeType="XML" type="translate" values="0 0; 0 -18" keyTimes="0; 1" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1; 1; 0" keyTimes="0; 0.5; 1" dur="2.4s" repeatCount="indefinite" />
        </g>
      )}

      {/* Pensamientos numéricos (invest) */}
      {variant === 'invest' && (
        <g fontFamily="system-ui, sans-serif" fontWeight="bold">
          <g>
            <text x="12" y="16" fontSize="8" fill="#0f9488">%</text>
            <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" dur="2.2s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 4; 0 -4" dur="2.2s" repeatCount="indefinite" />
          </g>
          <g>
            <text x="46" y="14" fontSize="8" fill="#eab308">$</text>
            <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 4; 0 -4" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
          </g>
          <g>
            <text x="30" y="9" fontSize="8" fill="#0f9488">↑</text>
            <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" dur="2.2s" begin="1.4s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 4; 0 -4" dur="2.2s" begin="1.4s" repeatCount="indefinite" />
          </g>
        </g>
      )}
    </svg>
  )
}
