interface PiggyLogoProps {
  size?: number
}

/**
 * Logo de Puggy: alcancía (chanchito) vista DE FRENTE, con ojos grandes mirando
 * hacia arriba, y una moneda que cae por la ranura de arriba (en bucle).
 * El chanchito hace un pequeño rebote cuando entra la moneda.
 * Es un SVG (dibujo vectorial): nítido en cualquier tamaño y muy liviano.
 */
export function PiggyLogo({ size = 44 }: PiggyLogoProps) {
  return (
    <svg
      className="piggy-logo"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Puggy"
    >
      <g className="piggy-body">
        {/* orejas */}
        <path d="M13 27 Q17 14 26 25 Z" fill="#ef94b4" />
        <path d="M51 27 Q47 14 38 25 Z" fill="#ef94b4" />
        {/* cuerpo (de frente) */}
        <ellipse cx="32" cy="40" rx="23" ry="19" fill="#f7a8c4" />
        {/* ranura de la moneda */}
        <rect x="26" y="21" width="12" height="3" rx="1.5" fill="#c76a90" />
        {/* ojo izquierdo (mirando hacia arriba) */}
        <ellipse cx="24" cy="37" rx="4.3" ry="5.1" fill="#ffffff" />
        <circle cx="24.8" cy="35.2" r="2.4" fill="#5b3a29" />
        <circle cx="24" cy="34.4" r="0.8" fill="#ffffff" />
        {/* ojo derecho (mirando hacia arriba) */}
        <ellipse cx="40" cy="37" rx="4.3" ry="5.1" fill="#ffffff" />
        <circle cx="40.8" cy="35.2" r="2.4" fill="#5b3a29" />
        <circle cx="40" cy="34.4" r="0.8" fill="#ffffff" />
        {/* hocico */}
        <ellipse cx="32" cy="49" rx="8" ry="6" fill="#ef94b4" />
        <ellipse cx="29" cy="49" rx="1.1" ry="2" fill="#c76a90" />
        <ellipse cx="35" cy="49" rx="1.1" ry="2" fill="#c76a90" />
      </g>

      {/* Moneda que cae dentro de la ranura, en bucle */}
      <g>
        <circle
          cx="32"
          cy="9"
          r="4.8"
          fill="#fcd34d"
          stroke="#eab308"
          strokeWidth="1.3"
        />
        <text
          x="32"
          y="11.7"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="bold"
          fill="#a16207"
          fontFamily="system-ui, sans-serif"
        >
          $
        </text>
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="translate"
          values="0 0; 0 12; 0 12"
          keyTimes="0; 0.55; 1"
          dur="2.6s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.35 0 0.85 1; 0 0 1 1"
        />
        <animate
          attributeName="opacity"
          values="0; 1; 1; 0; 0"
          keyTimes="0; 0.08; 0.5; 0.62; 1"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  )
}
