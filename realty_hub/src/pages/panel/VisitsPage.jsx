import { endOfMonth, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { CalendarDays, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ESTADOS_VISITA, listMisVisitas } from '@/api/visitaApi'
import { useAuth } from '@/auth/auth-context'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Select } from '@/components/ui/select'
import { VisitList } from '@/components/visit/VisitList'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { cn } from '@/lib/utils'
import { ESTADO_VISITA_LABELS, formatShortDay, nowInBogota, parseLocal, relativeDay, toLocalDateTime } from '@/lib/visit'

/**
 * Agenda de visitas (`GET /visitas/mis-visitas`). El CLIENTE ve las que agendó; los demás roles, las visitas
 * donde son el agente asignado (docs/visitas-service.md). Se consulta un mes a la vez según el calendario.
 */
export default function VisitsPage() {
  const { user } = useAuth()
  const asClient = user.rol === 'CLIENTE'
  const [toast, showToast] = useToast()
  const [today] = useState(nowInBogota)
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [day, setDay] = useState(null)
  const [estado, setEstado] = useState('')

  const result = useAsync(
    (signal) =>
      listMisVisitas({
        signal,
        estado,
        desde: toLocalDateTime(startOfMonth(month)),
        hasta: toLocalDateTime(endOfMonth(month)),
      }),
    [month.getTime(), estado],
  )

  const visitas = useMemo(() => result.data ?? [], [result.data])
  const propiedades = usePropertySummaries(visitas.map((v) => v.propiedadId))
  const marked = useMemo(
    () => visitas.filter((v) => v.estadoVisita !== 'CANCELADA').map((v) => parseLocal(v.fechaHora)).filter(Boolean),
    [visitas],
  )
  const shown = day ? visitas.filter((v) => isSameDay(parseLocal(v.fechaHora), day)) : visitas
  const proxima = visitas
    .filter((v) => v.estadoVisita === 'PROGRAMADA' && parseLocal(v.fechaHora) >= today)
    .sort((a, b) => (a.fechaHora < b.fechaHora ? -1 : 1))[0]
  const programadas = visitas.filter((v) => v.estadoVisita === 'PROGRAMADA').length

  function changeMonth(m) {
    setMonth(startOfMonth(m))
    setDay(null)
  }

  function handleChanged(updated, nuevoEstado) {
    result.setData((list) => (list ?? []).map((v) => (v.id === updated.id ? updated : v)))
    showToast(nuevoEstado === 'REALIZADA' ? 'Visita marcada como realizada' : 'Visita cancelada')
  }

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title={asClient ? 'Mis visitas' : 'Agenda de visitas'}
        description={
          asClient
            ? 'Visitas que agendaste a propiedades del catálogo. Puedes cancelar una visita programada o agendar otra cuando la anterior termine.'
            : 'Visitas asignadas a ti. Marca cada una como realizada cuando termine, o cancélala si no se va a hacer.'
        }
        actions={
          asClient && (
            <Link to="/propiedades" className={buttonVariants()}>
              Explorar propiedades
            </Link>
          )
        }
      />

      <div className="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="w-fit rounded-card border border-ash-grey/60 p-4">
            <Calendar
              mode="single"
              selected={day ?? undefined}
              onSelect={(d) => setDay(d ?? null)}
              month={month}
              onMonthChange={changeMonth}
              modifiers={{ marked }}
            />
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-ash-grey/40 px-2 pt-3 text-meta text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-depths" aria-hidden="true" />
                Días con visitas
              </span>
              {!isSameMonth(month, today) || day ? (
                <Button
                  variant="link"
                  size="sm"
                  className="text-meta"
                  onClick={() => {
                    setMonth(startOfMonth(today))
                    setDay(null)
                  }}
                >
                  Volver a hoy
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="estado-visita" className="text-small font-medium text-evergreen">
              Estado
            </label>
            <Select id="estado-visita" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_VISITA.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_VISITA_LABELS[e]}
                </option>
              ))}
            </Select>
          </div>

          {proxima && (
            <div className="rounded-card bg-pale-oak/25 p-5">
              <p className="text-small text-muted-foreground">Próxima visita</p>
              <p className="mt-1 font-display text-subtitle font-semibold leading-tight text-evergreen">
                {relativeDay(parseLocal(proxima.fechaHora), today)}, {proxima.fechaHora.slice(11, 16)}
              </p>
              <p className="mt-1 line-clamp-2 text-small text-evergreen/80">{propiedades[proxima.propiedadId]?.titulo ?? ' '}</p>
            </div>
          )}
        </aside>

        <section aria-labelledby="lista-visitas" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lista-visitas" className="text-section leading-tight text-evergreen first-letter:uppercase">
              {day ? relativeDay(day, today) : month.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
            </h2>
            {!result.loading && !result.error && (
              <p className="text-small text-muted-foreground tabular-nums">
                {day ? formatShortDay(day) + ' · ' : ''}
                {shown.length} {shown.length === 1 ? 'visita' : 'visitas'}
                {!day && programadas > 0 && ` · ${programadas} ${programadas === 1 ? 'programada' : 'programadas'}`}
              </p>
            )}
          </div>

          {result.error ? (
            <LoadError error={result.error} onRetry={result.reload} />
          ) : result.loading && !result.data ? (
            <ListSkeleton rows={4} />
          ) : shown.length === 0 ? (
            day || estado ? (
              <EmptyState
                icon={Search}
                title={day ? 'No hay visitas este día' : 'Ninguna visita coincide con el filtro'}
                text={day ? 'Elige otro día marcado en el calendario o mira el mes completo.' : 'Prueba con otro estado.'}
                action={
                  day && (
                    <Button variant="outline" size="sm" onClick={() => setDay(null)}>
                      Ver el mes completo
                    </Button>
                  )
                }
              />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title={asClient ? 'No tienes visitas este mes' : 'No tienes visitas asignadas este mes'}
                text={
                  asClient
                    ? 'Elige una propiedad del catálogo y agenda una visita en el día y la hora que prefieras.'
                    : 'Las visitas aparecen aquí cuando un cliente agenda una y se te asigna.'
                }
                action={
                  asClient && (
                    <Link to="/propiedades" className={buttonVariants({ size: 'sm' })}>
                      Explorar propiedades
                    </Link>
                  )
                }
              />
            )
          ) : (
            <div className={cn('transition-opacity duration-200', result.loading && 'opacity-60')}>
              <VisitList
                visitas={shown}
                propiedades={propiedades}
                asClient={asClient}
                onChanged={handleChanged}
                onRescheduled={() => result.reload()}
              />
            </div>
          )}
        </section>
      </div>
      {toast}
    </div>
  )
}
