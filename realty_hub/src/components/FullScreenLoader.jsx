import { LoaderCircle } from 'lucide-react'

export function FullScreenLoader({ label = 'Cargando sesión' }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-floral-white" role="status" aria-live="polite">
      <LoaderCircle className="size-6 animate-spin text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
