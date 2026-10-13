import { RotateCw } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'

/** Recurso inexistente o error de carga en el sitio público: mensaje directo + salida clara. */
export function PublicMessage({ title, text, onRetry }) {
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
        <Link to="/oficinas" className={buttonVariants()}>
          Ver oficinas
        </Link>
      </div>
    </div>
  )
}

/** Mensaje según el error: 404 → no existe; resto → reintento. */
export function PublicError({ error, notFoundTitle, onRetry }) {
  if (error?.status === 404 || error?.status === 400) {
    return <PublicMessage title={notFoundTitle} text="Puede que el enlace sea antiguo o esté incompleto." />
  }
  return <PublicMessage title="No pudimos cargar esta página" text={error?.mensaje} onRetry={onRetry} />
}
