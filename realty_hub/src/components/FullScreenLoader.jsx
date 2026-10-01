/** Pantalla de carga: el isotipo de la casa se dibuja en bucle. */
export function FullScreenLoader({ label = 'Cargando sesión' }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4 bg-floral-white"
      role="status"
      aria-live="polite"
    >
      <svg viewBox="0 0 28 28" className="size-12 text-evergreen" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path
          d="M4 24V11l10-7 10 7v13"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
          className="draw-loop"
        />
        <path
          d="M11 24v-7h6v7"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
          className="draw-loop text-emerald-depths [animation-delay:0.3s]"
        />
      </svg>
      <span className="animate-pulse text-small text-muted-foreground">{label}</span>
    </div>
  )
}
