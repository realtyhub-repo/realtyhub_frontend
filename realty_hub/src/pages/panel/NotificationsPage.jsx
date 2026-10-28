import { BellOff, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { listNotificaciones } from '@/api/notificacionApi'
import { NotificationItem } from '@/components/panel/NotificationItem'
import { PageHeader } from '@/components/panel/PageHeader'
import { Segmented } from '@/components/panel/Segmented'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { useAsync } from '@/hooks/useAsync'
import { useNotifications } from '@/hooks/notifications-context'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { noLeidas, cambios, marcarLeida, marcarTodasLeidas } = useNotifications()
  const [toast, showToast] = useToast()
  const [marking, setMarking] = useState(false)

  const soloNoLeidas = params.get('filtro') === 'no-leidas'
  const pagina = Math.max(0, Number.parseInt(params.get('pagina') ?? '0', 10) || 0)

  const result = useAsync((signal) => listNotificaciones({ soloNoLeidas, pagina, signal }), [soloNoLeidas, pagina, cambios])
  const items = result.data?.contenido ?? []
  const total = result.data?.totalElementos ?? 0

  function update(changes) {
    const next = { filtro: soloNoLeidas ? 'no-leidas' : '', pagina: 0, ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== '' && !(k === 'pagina' && !v))), { replace: true })
  }

  function abrir(n, destino) {
    if (!n.leida) {
      result.setData((d) => d && { ...d, contenido: d.contenido.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) })
      marcarLeida(n.id).catch(() => {})
    }
    if (destino) navigate(destino)
  }

  async function leerTodas() {
    setMarking(true)
    try {
      await marcarTodasLeidas()
      showToast('Notificaciones marcadas como leídas')
      result.reload()
    } catch (err) {
      showToast(err?.mensaje ?? 'No se pudieron marcar las notificaciones')
    } finally {
      setMarking(false)
    }
  }

  const refreshing = result.loading && !!result.data

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Notificaciones"
        description="Avisos de tus visitas, contratos y comisiones. También te los enviamos por correo cuando corresponde."
        actions={
          <>
            <Button variant="outline" onClick={leerTodas} loading={marking} disabled={noLeidas === 0}>
              Marcar todas como leídas
            </Button>
            <Button variant="outline" onClick={result.reload} loading={refreshing}>
              {!refreshing && <RotateCw strokeWidth={1.75} aria-hidden="true" />}
              Actualizar
            </Button>
          </>
        }
      />

      <section aria-labelledby="lista-notificaciones" className="space-y-4">
        <h2 id="lista-notificaciones" className="sr-only">
          Lista de notificaciones
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label="Filtro de notificaciones"
            options={[
              { value: '', label: 'Todas' },
              { value: 'no-leidas', label: 'No leídas', count: noLeidas },
            ]}
            value={soloNoLeidas ? 'no-leidas' : ''}
            onChange={(v) => update({ filtro: v })}
          />
          {result.data && total > 0 && (
            <p className="text-small tabular-nums text-muted-foreground">
              {total} {total === 1 ? 'notificación' : 'notificaciones'}
            </p>
          )}
        </div>

        {result.error && !result.data ? (
          <LoadError error={result.error} onRetry={result.reload} />
        ) : result.loading && !result.data ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          soloNoLeidas ? (
            <EmptyState
              icon={BellOff}
              title="No tienes notificaciones sin leer"
              action={
                <Button variant="outline" size="sm" onClick={() => update({ filtro: '' })}>
                  Ver todas
                </Button>
              }
            />
          ) : (
            <EmptyState icon={BellOff} title="Aún no tienes notificaciones" text="Aquí aparecerán los avisos de visitas, contratos y comisiones." />
          )
        ) : (
          <ul className={cn('divide-y divide-ash-grey/40 overflow-hidden rounded-card border border-ash-grey/60 transition-opacity duration-200', refreshing && 'opacity-60')}>
            {items.map((n) => (
              <li key={n.id}>
                <NotificationItem notificacion={n} onOpen={abrir} />
              </li>
            ))}
          </ul>
        )}

        <Pagination page={result.data?.pagina ?? pagina} totalPages={result.data?.totalPaginas} onChange={(p) => update({ pagina: p })} className="pt-2" />
      </section>

      {toast}
    </div>
  )
}
