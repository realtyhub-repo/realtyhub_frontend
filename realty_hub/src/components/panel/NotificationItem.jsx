import { useAuth } from '@/auth/auth-context'
import { TIPO_NOTIFICACION, TIPO_NOTIFICACION_DEFAULT, destinoNotificacion, fechaCompleta, tiempoRelativo } from '@/lib/notification'
import { cn } from '@/lib/utils'

export function NotificationItem({ notificacion: n, onOpen }) {
  const { user } = useAuth()
  const { icon: Icon, tone } = TIPO_NOTIFICACION[n.tipo] ?? TIPO_NOTIFICACION_DEFAULT
  const destino = destinoNotificacion(n, user.rol)

  return (
    <button
      type="button"
      onClick={() => onOpen(n, destino)}
      className={cn(
        'relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 focus-visible:bg-pale-oak/20 focus-visible:outline-none',
        n.leida ? 'hover:bg-pale-oak/10' : 'bg-pale-oak/20 hover:bg-pale-oak/30',
      )}
    >
      {!n.leida && <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-depths" aria-hidden="true" />}
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-floral-white ring-1 ring-ash-grey/50">
        <Icon className={cn('size-4', tone)} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className={cn('block text-small text-evergreen', n.leida ? 'font-normal' : 'font-medium')}>{n.titulo}</span>
        <span className="block text-small text-muted-foreground">{n.mensaje}</span>
        <time dateTime={n.creadaEn} title={fechaCompleta(n.creadaEn)} className="block text-meta text-muted-foreground">
          {tiempoRelativo(n.creadaEn)}
        </time>
      </span>
      {!n.leida && (
        <>
          <span className="mt-2 size-2 shrink-0 rounded-full bg-emerald-depths" aria-hidden="true" />
          <span className="sr-only">No leída</span>
        </>
      )}
    </button>
  )
}
