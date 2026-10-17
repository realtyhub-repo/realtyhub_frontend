import { endOfWeek, startOfWeek } from 'date-fns'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { listMisVisitas } from '@/api/visitaApi'
import { PageHeader } from '@/components/panel/PageHeader'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { AgendaCalendar } from '@/components/visit/AgendaCalendar'
import { VisitDetailSheet } from '@/components/visit/VisitDetailSheet'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { cn } from '@/lib/utils'
import { hasStarted, nowInBogota, rangeParams, visitaErrorMessage } from '@/lib/visit'

function currentWeek() {
  const now = nowInBogota()
  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
}

/**
 * Agenda del agente (docs/visits-service.md §3): calendario semanal con `GET /visitas/mis-visitas` acotado a la
 * semana visible (`desde`/`hasta`). Al abrir una visita se ven la propiedad y el cliente, y las acciones.
 */
export default function AgendaPage() {
  const [toast, showToast] = useToast()
  const [range, setRange] = useState(currentWeek)
  const [selectedId, setSelectedId] = useState(null)
  const { desde, hasta } = rangeParams(range)

  const result = useAsync((signal) => listMisVisitas({ signal, desde, hasta }), [desde, hasta])
  const visitas = useMemo(() => result.data ?? [], [result.data])
  const propiedades = usePropertySummaries(visitas.map((v) => v.propiedadId))
  const selected = visitas.find((v) => v.id === selectedId) ?? null

  const stats = useMemo(() => {
    const by = (e) => visitas.filter((v) => v.estadoVisita === e)
    const programadas = by('PROGRAMADA')
    return [
      { id: 'programadas', label: 'Programadas', value: programadas.length, swatch: 'bg-evergreen' },
      { id: 'pendientes', label: 'Por marcar', value: programadas.filter((v) => hasStarted(v)).length, swatch: 'bg-pale-oak', hint: 'Ya empezaron y siguen programadas' },
      { id: 'realizadas', label: 'Realizadas', value: by('REALIZADA').length, swatch: 'bg-success' },
      { id: 'canceladas', label: 'Canceladas', value: by('CANCELADA').length, swatch: 'border border-dashed border-ash-grey' },
    ]
  }, [visitas])

  function handleUpdated(updated, nuevoEstado) {
    result.setData((list) => (list ?? []).map((v) => (v.id === updated.id ? updated : v)))
    showToast(nuevoEstado === 'REALIZADA' ? 'Visita marcada como realizada' : 'Visita cancelada')
  }

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        title="Agenda"
        description="Tus visitas de la semana. Abre una para ver la propiedad y al cliente, marcarla como realizada o cancelarla."
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-ash-grey/60 bg-ash-grey/40 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.id} className="bg-floral-white px-5 py-4" title={s.hint}>
            <dt className="flex items-center gap-2 text-small text-muted-foreground">
              <span className={cn('size-2.5 rounded-[3px]', s.swatch)} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-section font-semibold leading-none text-evergreen tabular-nums">
              {result.loading && !result.data ? <span className="inline-block h-6 w-8 animate-pulse rounded-full bg-pale-oak/40 align-middle" /> : s.value}
            </dd>
          </div>
        ))}
      </dl>

      {result.error && (
        <LoadError error={{ ...result.error, mensaje: visitaErrorMessage(result.error) }} onRetry={result.reload} />
      )}

      <div className="relative">
        <AgendaCalendar visitas={visitas} propiedades={propiedades} onRangeChange={setRange} onSelect={(v) => setSelectedId(v?.id ?? null)} />
        {result.loading && (
          <div
            className="pointer-events-none absolute right-4 top-[72px] z-10 flex items-center gap-2 rounded-full border border-ash-grey/60 bg-floral-white px-3 py-1.5 text-meta text-muted-foreground shadow-brand"
            role="status"
          >
            <LoaderCircle className="size-3.5 animate-spin" strokeWidth={1.75} aria-hidden="true" />
            Cargando visitas
          </div>
        )}
        {!result.loading && !result.error && visitas.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto w-fit rounded-control border border-ash-grey/60 bg-floral-white px-4 py-3 text-small text-muted-foreground shadow-brand">
            No tienes visitas programadas esta semana
          </p>
        )}
      </div>

      <VisitDetailSheet
        visita={selected}
        propiedad={selected ? propiedades[selected.propiedadId] : null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onUpdated={handleUpdated}
        onStale={result.reload}
      />
      {toast}
    </div>
  )
}
