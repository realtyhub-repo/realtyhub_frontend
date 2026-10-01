/**
 * Alzado de fachada en trazo fino (line art, 1.5px) para el panel de marca del login.
 * Decorativo: aria-hidden. El color se hereda con currentColor.
 */
export function FacadeIllustration({ className }) {
  const windows = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      windows.push(
        <g key={`${row}-${col}`} transform={`translate(${148 + col * 52} ${118 + row * 62})`}>
          <rect width="30" height="40" rx="1" />
          <line x1="15" y1="0" x2="15" y2="40" opacity="0.5" />
          <line x1="-4" y1="44" x2="34" y2="44" />
        </g>,
      )
    }
  }

  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Edificio principal */}
      <path d="M128 470V96h232v374" />
      <path d="M118 96h252" />
      <path d="M140 96V78h208v18" opacity="0.7" />
      {windows}
      {/* Planta baja y acceso */}
      <path d="M128 432h232" opacity="0.6" />
      <path d="M222 470v-64a22 22 0 0 1 44 0v64" />
      <line x1="244" y1="384" x2="244" y2="470" opacity="0.4" />
      {/* Edificio bajo lateral */}
      <path d="M360 470V250h96v220" opacity="0.55" />
      <path d="M352 250h112" opacity="0.55" />
      {[0, 1, 2].map((r) => (
        <g key={r} opacity="0.55" transform={`translate(378 ${278 + r * 58})`}>
          <rect width="24" height="32" rx="1" />
          <rect x="36" width="24" height="32" rx="1" />
        </g>
      ))}
      {/* Casa a la izquierda */}
      <path d="M40 470V330l44-36 44 36" opacity="0.55" />
      <path d="M62 470v-50h30v50" opacity="0.55" />
      <rect x="56" y="346" width="24" height="24" rx="1" opacity="0.55" />
      {/* Línea de suelo y cotas, a modo de plano */}
      <path d="M16 470h488" />
      <path d="M128 492h232" strokeDasharray="2 6" opacity="0.45" />
      <path d="M128 486v12M360 486v12" opacity="0.45" />
      <path d="M484 96v374" strokeDasharray="2 6" opacity="0.35" />
      <path d="M478 96h12M478 470h12" opacity="0.35" />
    </svg>
  )
}
