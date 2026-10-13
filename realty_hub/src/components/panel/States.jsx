import { RotateCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Estado vacío: tono directo + acción clara (CLAUDE.md §6). */
export function EmptyState({ icon: Icon, title, text, action, className }) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-card border border-dashed border-ash-grey px-6 py-10', className)}>
      {Icon && <Icon className="size-6 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />}
      <div className="space-y-1">
        <p className="font-medium text-evergreen">{title}</p>
        {text && <p className="max-w-[60ch] text-small text-muted-foreground">{text}</p>}
      </div>
      {action}
    </div>
  )
}

/** Error de carga con reintento. */
export function LoadError({ error, onRetry, className }) {
  return (
    <Alert variant="error" className={className}>
      <p>{error?.status === 403 ? 'No tienes permiso para ver esta información.' : error?.mensaje}</p>
      {onRetry && error?.status !== 403 && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-error/40 text-error hover:border-error hover:bg-error/5">
          <RotateCw strokeWidth={1.75} aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </Alert>
  )
}

/** Filas grises mientras carga una lista. */
export function ListSkeleton({ rows = 5, className }) {
  return (
    <div className={cn('divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60', className)} role="status" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="h-3 w-1/3 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="ml-auto h-3 w-20 animate-pulse rounded-full bg-pale-oak/30" />
        </div>
      ))}
    </div>
  )
}
