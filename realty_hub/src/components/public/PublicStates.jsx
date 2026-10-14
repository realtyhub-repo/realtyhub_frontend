import { RotateCw } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'

const DEFAULT_BACK = { to: '/oficinas', label: 'Ver oficinas' }

/**
 * Recurso inexistente o error de carga en el sitio público: mensaje directo + salida clara.
 * `back` = { to, label } para la salida principal; `null` la oculta.
 */
export function PublicMessage({ title, text, onRetry, back = DEFAULT_BACK }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-section leading-tight text-evergreen">{title}</h1>
      {text && <p className="max-w-[48ch] text-muted-foreground">{text}</p>}
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCw strokeWidth={1.75} aria-hidden="true" />
            Reintentar
          </Button>
        )}
        {back && (
          <Link to={back.to} className={buttonVariants()}>
            {back.label}
          </Link>
        )}
      </div>
    </div>
  )
}

/** Mensaje según el error: 404 → no existe; resto → reintento. */
export function PublicError({ error, notFoundTitle, onRetry, back }) {
  if (error?.status === 404 || error?.status === 400) {
    return <PublicMessage title={notFoundTitle} text="Puede que el enlace sea antiguo o esté incompleto." back={back} />
  }
  return <PublicMessage title="No pudimos cargar esta página" text={error?.mensaje} onRetry={onRetry} back={back} />
}
