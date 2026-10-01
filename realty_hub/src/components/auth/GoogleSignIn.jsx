import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Botón de Google Identity Services. Entrega el ID token (`credential`), que es lo que espera
 * POST /auth/google — no usar useGoogleLogin (devuelve un access token de Google, no sirve).
 * Si no hay VITE_GOOGLE_CLIENT_ID configurado, no se renderiza.
 */
export function GoogleSignIn({ onCredential, onError, disabled }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(null)

  // El botón de Google necesita un ancho fijo en px (máx. 400): se ajusta al contenedor.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.min(400, Math.floor(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div
      ref={containerRef}
      className={disabled ? 'pointer-events-none min-h-11 opacity-60' : 'min-h-11'}
      aria-disabled={disabled || undefined}
    >
      {width && (
        <GoogleLogin
          onSuccess={(res) => (res.credential ? onCredential(res.credential) : onError?.())}
          onError={() => onError?.()}
          theme="outline"
          size="large"
          shape="rectangular"
          text="continue_with"
          logo_alignment="center"
          locale="es"
          width={String(width)}
        />
      )}
    </div>
  )
}

export function OrDivider() {
  if (!GOOGLE_CLIENT_ID) return null
  return (
    <div className="my-6 flex items-center gap-4 text-meta text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-ash-grey/60" aria-hidden="true" />o
      <span className="h-px flex-1 bg-ash-grey/60" aria-hidden="true" />
    </div>
  )
}
