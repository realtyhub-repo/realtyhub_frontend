import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listNotificaciones } from '@/api/notificacionApi'
import { NotificationItem } from '@/components/panel/NotificationItem'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAsync } from '@/hooks/useAsync'
import { useNotifications } from '@/hooks/notifications-context'
import { cn } from '@/lib/utils'

const TAMANIO_PANEL = 10

export function NotificationBell() {
  const { noLeidas } = useNotifications()
  const [open, setOpen] = useState(false)
  const label = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label}>
          <Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />
          {noLeidas > 0 && (
            <span
              className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-depths px-1 text-[11px] font-medium leading-none tabular-nums text-floral-white ring-2 ring-floral-white"
              aria-hidden="true"
            >
              {noLeidas > 99 ? '99+' : noLeidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <NotificationPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

function NotificationPanel({ onClose }) {
  const navigate = useNavigate()
  const { noLeidas, cambios, marcarLeida, marcarTodasLeidas } = useNotifications()
  const [marking, setMarking] = useState(false)
  const result = useAsync((signal) => listNotificaciones({ pagina: 0, tamanio: TAMANIO_PANEL, signal }), [cambios])
  const items = result.data?.contenido ?? []

  function abrir(n, destino) {
    if (!n.leida) {
      result.setData((d) => d && { ...d, contenido: d.contenido.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) })
      marcarLeida(n.id).catch(() => {})
    }
    if (destino) {
      onClose()
      navigate(destino)
    }
  }

  async function leerTodas() {
    setMarking(true)
    try {
      await marcarTodasLeidas()
      result.setData((d) => d && { ...d, contenido: d.contenido.map((x) => ({ ...x, leida: true })) })
    } catch {
      result.reload()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="flex max-h-[min(34rem,calc(100svh-6rem))] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-ash-grey/50 px-4 py-3">
        <h2 className="font-display text-body font-semibold text-evergreen">Notificaciones</h2>
        <Button variant="link" onClick={leerTodas} loading={marking} disabled={noLeidas === 0}>
          Marcar todas como leídas
        </Button>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto transition-opacity duration-200', result.loading && result.data && 'opacity-60')}>
        {result.error && !result.data ? (
          <div className="p-4">
            <LoadError error={result.error} onRetry={result.reload} />
          </div>
        ) : result.loading && !result.data ? (
          <ListSkeleton rows={3} className="rounded-none border-0" />
        ) : items.length === 0 ? (
          <EmptyState icon={BellOff} title="No tienes notificaciones" text="Aquí aparecerán los avisos de visitas, contratos y comisiones." className="m-4" />
        ) : (
          <ul className="divide-y divide-ash-grey/40">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationItem notificacion={n} onOpen={abrir} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-ash-grey/50 px-4 py-3">
        <Link
          to="/panel/notificaciones"
          onClick={onClose}
          className="text-small font-medium text-emerald-depths underline-offset-4 hover:text-evergreen hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver todas las notificaciones
        </Link>
      </div>
    </div>
  )
}
