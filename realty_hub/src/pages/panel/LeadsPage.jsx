import { ChevronRight, Contact, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ESTADOS_LEAD, listMisLeads } from '@/api/leadApi'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { cn } from '@/lib/utils'
import { ESTADO_LEAD_BADGE, ESTADO_LEAD_LABELS, formatHour, formatShortDay, parseLocal } from '@/lib/visit'

/**
 * Leads asignados al agente autenticado (`GET /leads/mis-leads`). Se pide la lista completa una vez y el
 * filtro por estado se aplica aquí, para mostrar cuántos hay en cada etapa del embudo.
 */
export default function LeadsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const estado = ESTADOS_LEAD.includes(params.get('estado')) ? params.get('estado') : ''
  const result = useAsync((signal) => listMisLeads({ signal }), [])
  const leads = useMemo(() => result.data ?? [], [result.data])
  const propiedades = usePropertySummaries(leads.map((l) => l.propiedadId))

  const counts = useMemo(() => Object.fromEntries(ESTADOS_LEAD.map((e) => [e, leads.filter((l) => l.estado === e).length])), [leads])
  const shown = useMemo(
    () =>
      leads
        .filter((l) => !estado || l.estado === estado)
        // Visita más reciente primero; los leads sin visita al final.
        .sort((a, b) => (b.fechaHoraVisita ?? '').localeCompare(a.fechaHoraVisita ?? '')),
    [leads, estado],
  )

  function selectEstado(e) {
    setParams(e ? { estado: e } : {}, { replace: true })
  }

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        title="Leads"
        description="Clientes interesados en una propiedad que te fueron asignados al agendar una visita. Avanza cada uno por el embudo hasta cerrarlo o descartarlo."
      />

      {!result.error && leads.length > 0 && (
        <nav aria-label="Filtrar por estado" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1 border-b border-ash-grey/50">
            {[['', 'Todos', leads.length], ...ESTADOS_LEAD.map((e) => [e, ESTADO_LEAD_LABELS[e], counts[e]])].map(([value, label, count]) => {
              const active = estado === value
              return (
                <li key={value || 'todos'}>
                  <button
                    type="button"
                    onClick={() => selectEstado(value)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      '-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-evergreen',
                    )}
                  >
                    {label}
                    <span className={cn('rounded-full px-1.5 text-meta tabular-nums', active ? 'bg-evergreen text-floral-white' : 'bg-pale-oak/40 text-evergreen')}>
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {result.error ? (
        <LoadError error={result.error} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <ListSkeleton rows={6} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="Aún no tienes leads asignados"
          text="Cuando un cliente agende una visita a una propiedad y se te asigne, el lead aparecerá aquí."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No tienes leads en estado ${ESTADO_LEAD_LABELS[estado]?.toLowerCase()}`}
          action={
            <button type="button" onClick={() => selectEstado('')} className="text-small font-medium text-emerald-depths hover:text-evergreen hover:underline">
              Ver todos los leads
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-ash-grey/60">
          <table className="w-full text-left text-small">
            <thead className="border-b border-ash-grey/60 bg-pale-oak/15 text-meta text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Propiedad</th>
                <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Visita</th>
                <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-grey/40">
              {shown.map((l) => {
                const prop = propiedades[l.propiedadId]
                const visita = parseLocal(l.fechaHoraVisita)
                return (
                  <tr key={l.id} onClick={() => navigate(`/panel/leads/${l.id}`)} className="group cursor-pointer transition-colors duration-150 hover:bg-pale-oak/10">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        <PropertyPhoto src={prop?.foto} alt="" label="" className="aspect-[4/3] w-16 shrink-0 rounded-control sm:w-20" />
                        <div className="min-w-0">
                          <Link
                            to={`/panel/leads/${l.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="line-clamp-2 font-medium text-evergreen sm:line-clamp-1 focus-visible:underline focus-visible:outline-none"
                          >
                            {prop?.titulo ?? (prop?.missing ? 'Propiedad no disponible' : <span className="inline-block h-3 w-40 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
                          </Link>
                          <p className="text-muted-foreground">{prop?.ciudad}</p>
                          {visita && (
                            <p className="text-muted-foreground tabular-nums md:hidden">
                              Visita {formatShortDay(visita)}, {formatHour(visita)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 tabular-nums md:table-cell">
                      {visita ? (
                        <>
                          <span className="text-evergreen">{formatShortDay(visita)}</span>
                          <span className="text-muted-foreground"> · {formatHour(visita)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sin visita</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={ESTADO_LEAD_BADGE[l.estado] ?? 'outline'} dot>
                        {ESTADO_LEAD_LABELS[l.estado] ?? l.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="size-4 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
