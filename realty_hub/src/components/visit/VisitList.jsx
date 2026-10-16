import { CalendarPlus, CircleCheck, ExternalLink, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { cambiarEstadoVisita } from '@/api/visitaApi'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ScheduleVisitDialog } from './ScheduleVisitDialog'
import {
  ESTADO_VISITA_BADGE,
  ESTADO_VISITA_LABELS,
  formatHour,
  formatShortDay,
  nowInBogota,
  parseLocal,
  relativeDay,
} from '@/lib/visit'

/**
 * Visitas agrupadas por día, con las acciones que permite el backend (docs/visitas-service.md):
 * - Solo desde PROGRAMADA. "Marcar realizada" únicamente si la hora de inicio ya pasó (agente).
 * - El cliente puede cancelar su propia visita y, si ya no tiene una programada, agendar otra sobre el mismo lead.
 *
 * `asClient`: vista del cliente (enlaces al catálogo, sin enlace al lead).
 * `onChanged(visita)`: la visita actualizada tras un cambio de estado. `onRescheduled()`: tras agendar otra.
 */
export function VisitList({ visitas, propiedades = {}, asClient = false, showProperty = true, onChanged, onRescheduled }) {
  const [confirm, setConfirm] = useState(null)
  const [reschedule, setReschedule] = useState(null)
  const now = nowInBogota()

  // Un lead admite una sola visita PROGRAMADA a la vez: no ofrecer "agendar otra" si ya la tiene.
  const leadsConProgramada = new Set(visitas.filter((v) => v.estadoVisita === 'PROGRAMADA').map((v) => v.leadId))
  const groups = groupByDay(visitas)

  return (
    <>
      <div className="space-y-8">
        {groups.map(({ key, day, items }) => (
          <section key={key} aria-label={formatShortDay(day)}>
            <h3 className="mb-3 flex items-baseline gap-2 text-body text-evergreen">
              {relativeDay(day, now)}
              <span className="font-sans text-meta font-normal text-muted-foreground">{formatShortDay(day)}</span>
            </h3>
            <ul className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60">
              {items.map((v) => {
                const inicio = parseLocal(v.fechaHora)
                const fin = parseLocal(v.fechaHoraFin)
                const prop = propiedades[v.propiedadId]
                const programada = v.estadoVisita === 'PROGRAMADA'
                const empezo = inicio && inicio <= now
                return (
                  <li key={v.id} className={cn('flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center', v.estadoVisita === 'CANCELADA' && 'bg-floral-white')}>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="w-16 shrink-0 border-r border-ash-grey/50 pr-4 text-right">
                        <p className={cn('font-display text-subtitle font-semibold leading-none tabular-nums', v.estadoVisita === 'CANCELADA' ? 'text-ash-grey line-through' : 'text-evergreen')}>
                          {formatHour(inicio)}
                        </p>
                        <p className="mt-1 text-meta text-muted-foreground tabular-nums">{formatHour(fin)}</p>
                      </div>

                      {showProperty && (
                        <PropertyPhoto src={prop?.foto} alt="" label="" className="hidden aspect-[4/3] w-20 shrink-0 rounded-control sm:block" />
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        {showProperty && (
                          <Link
                            to={asClient ? `/propiedades/${v.propiedadId}` : `/panel/leads/${v.leadId}`}
                            className="line-clamp-1 font-medium text-evergreen hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            {prop?.titulo ?? (prop?.missing ? 'Propiedad no disponible' : <span className="inline-block h-3 w-40 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
                          </Link>
                        )}
                        {showProperty && prop?.direccion && (
                          <p className="flex items-center gap-1.5 truncate text-small text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                            <span className="truncate">
                              {prop.direccion}
                              {prop.ciudad ? `, ${prop.ciudad}` : ''}
                            </span>
                          </p>
                        )}
                        <Badge variant={ESTADO_VISITA_BADGE[v.estadoVisita] ?? 'outline'} dot>
                          {ESTADO_VISITA_LABELS[v.estadoVisita] ?? v.estadoVisita}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {!asClient && programada && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!empezo}
                          title={empezo ? undefined : 'Podrás marcarla cuando llegue la hora de inicio'}
                          onClick={() => setConfirm({ visita: v, estado: 'REALIZADA' })}
                        >
                          <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                          Marcar realizada
                        </Button>
                      )}
                      {programada && !(asClient && empezo) && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ visita: v, estado: 'CANCELADA' })}>
                          <X strokeWidth={1.75} aria-hidden="true" />
                          Cancelar visita
                        </Button>
                      )}
                      {asClient && !programada && !leadsConProgramada.has(v.leadId) && (
                        <Button variant="outline" size="sm" onClick={() => setReschedule(v)}>
                          <CalendarPlus strokeWidth={1.75} aria-hidden="true" />
                          Agendar otra visita
                        </Button>
                      )}
                      {asClient && (
                        <Link to={`/propiedades/${v.propiedadId}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                          <ExternalLink strokeWidth={1.75} aria-hidden="true" />
                          Ver propiedad
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.estado === 'REALIZADA' ? 'Marcar visita como realizada' : 'Cancelar visita'}
        description={
          confirm &&
          `${relativeDay(parseLocal(confirm.visita.fechaHora), now)}, ${formatHour(parseLocal(confirm.visita.fechaHora))}${
            propiedades[confirm.visita.propiedadId]?.titulo ? ` · ${propiedades[confirm.visita.propiedadId].titulo}` : ''
          }. Este cambio no se puede deshacer.`
        }
        confirmLabel={confirm?.estado === 'REALIZADA' ? 'Marcar realizada' : 'Cancelar visita'}
        destructive={confirm?.estado === 'CANCELADA'}
        onConfirm={async () => {
          const updated = await cambiarEstadoVisita(confirm.visita.id, confirm.estado)
          onChanged?.(updated ?? { ...confirm.visita, estadoVisita: confirm.estado }, confirm.estado)
        }}
      />

      {reschedule && (
        <ScheduleVisitDialog
          open
          onOpenChange={(open) => !open && setReschedule(null)}
          propiedad={{ id: reschedule.propiedadId, titulo: propiedades[reschedule.propiedadId]?.titulo ?? 'Propiedad' }}
          leadId={reschedule.leadId}
          onScheduled={onRescheduled}
        />
      )}
    </>
  )
}

function groupByDay(visitas) {
  const sorted = [...visitas].sort((a, b) => (a.fechaHora < b.fechaHora ? -1 : a.fechaHora > b.fechaHora ? 1 : 0))
  const groups = []
  for (const v of sorted) {
    const key = v.fechaHora?.slice(0, 10) ?? '—'
    let g = groups.at(-1)
    if (!g || g.key !== key) {
      g = { key, day: parseLocal(v.fechaHora), items: [] }
      groups.push(g)
    }
    g.items.push(v)
  }
  return groups
}
