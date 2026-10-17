import { CalendarDays, MapPin, Search, UserRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ESTADOS_VISITA, cambiarEstadoVisita, listMisVisitas } from '@/api/visitaApi'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { PageHeader } from '@/components/panel/PageHeader'
import { Segmented } from '@/components/panel/Segmented'
import { EmptyState, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { DateRangeFilter } from '@/components/visit/DateRangeFilter'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { cn } from '@/lib/utils'
import {
  ESTADO_VISITA_BADGE,
  ESTADO_VISITA_LABELS,
  agentName,
  defaultRange,
  formatRange,
  formatShortDay,
  nowInBogota,
  parseLocal,
  rangeParams,
  relativeDay,
  visitaErrorMessage,
} from '@/lib/visit'

const ESTADO_OPTIONS = [
  ...ESTADOS_VISITA.map((e) => ({ value: e, label: e === 'PROGRAMADA' ? 'Programadas' : e === 'REALIZADA' ? 'Realizadas' : 'Canceladas' })),
  { value: '', label: 'Todas' },
]

/**
 * Mis visitas (cliente, docs/visits-service.md §2): `GET /visitas/mis-visitas` filtrado por estado
 * (por defecto PROGRAMADA) y por rango (por defecto hoy → 30 días). Solo las programadas se pueden cancelar.
 */
export default function ClientVisitsPage() {
  const [toast, showToast] = useToast()
  const [estado, setEstado] = useState('PROGRAMADA')
  const [range, setRange] = useState(() => defaultRange())
  const [cancelando, setCancelando] = useState(null)
  const { desde, hasta } = rangeParams(range)

  const result = useAsync((signal) => listMisVisitas({ signal, estado, desde, hasta }), [estado, desde, hasta])
  const visitas = useMemo(
    () => [...(result.data ?? [])].sort((a, b) => (a.fechaHora < b.fechaHora ? -1 : a.fechaHora > b.fechaHora ? 1 : 0)),
    [result.data],
  )
  const propiedades = usePropertySummaries(visitas.map((v) => v.propiedadId))

  async function cancelar() {
    const v = cancelando
    try {
      const updated = await cambiarEstadoVisita(v.id, 'CANCELADA')
      result.setData((list) => (list ?? []).map((x) => (x.id === v.id ? (updated ?? x) : x)))
      showToast('Visita cancelada')
    } catch (err) {
      // TRANSICION_INVALIDA: la visita cambió en el servidor (realizada o cancelada automáticamente).
      if (err?.codigo === 'TRANSICION_INVALIDA' || err?.codigo === 'VISITA_NO_ENCONTRADA') result.reload()
      throw Object.assign(err, { mensaje: visitaErrorMessage(err) })
    }
  }

  const filtered = estado !== 'PROGRAMADA'

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        title="Mis visitas"
        description="Las visitas que agendaste a propiedades del catálogo. Puedes cancelar una visita mientras siga programada."
        actions={
          <Link to="/propiedades" className={buttonVariants({ variant: 'outline' })}>
            Explorar propiedades
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Estado de la visita" options={ESTADO_OPTIONS} value={estado} onChange={setEstado} />
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {result.error ? (
        <LoadError error={{ ...result.error, mensaje: visitaErrorMessage(result.error) }} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <VisitCardsSkeleton />
      ) : visitas.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            title={estado ? `No tienes visitas ${ESTADO_VISITA_LABELS[estado].toLowerCase()}s en este rango` : 'No tienes visitas en este rango'}
            text="Prueba con otro estado u otro rango de fechas."
            action={
              <Button variant="outline" size="sm" onClick={() => setEstado('PROGRAMADA')}>
                Ver programadas
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No tienes visitas programadas"
            text="Elige una propiedad del catálogo y agenda una visita el día y a la hora que prefieras."
            action={
              <Link to="/propiedades" className={buttonVariants({ size: 'sm' })}>
                Explorar propiedades
              </Link>
            }
          />
        )
      ) : (
        <>
          <p className="text-small text-muted-foreground tabular-nums">
            {visitas.length} {visitas.length === 1 ? 'visita' : 'visitas'} · {formatShortDay(range.from)} – {formatShortDay(range.to)}
          </p>
          <ul className={cn('space-y-4 transition-opacity duration-200', result.loading && 'opacity-60')}>
            {visitas.map((v) => (
              <li key={v.id}>
                <VisitCard visita={v} propiedad={propiedades[v.propiedadId]} onCancel={() => setCancelando(v)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!cancelando}
        onOpenChange={(open) => !open && setCancelando(null)}
        title="Cancelar visita"
        description={
          cancelando &&
          `${relativeDay(parseLocal(cancelando.fechaHora))}, ${formatRange(parseLocal(cancelando.fechaHora), parseLocal(cancelando.fechaHoraFin))}${
            propiedades[cancelando.propiedadId]?.titulo ? ` · ${propiedades[cancelando.propiedadId].titulo}` : ''
          }. El agente dejará de esperarte y la hora quedará libre. Este cambio no se puede deshacer.`
        }
        confirmLabel="Cancelar visita"
        destructive
        onConfirm={cancelar}
      />
      {toast}
    </div>
  )
}

function VisitCard({ visita: v, propiedad: p, onCancel }) {
  const inicio = parseLocal(v.fechaHora)
  const fin = parseLocal(v.fechaHoraFin)
  const programada = v.estadoVisita === 'PROGRAMADA'
  const cancelada = v.estadoVisita === 'CANCELADA'
  const noDisponible = p && (p.missing || (p.estadoComercial && p.estadoComercial !== 'DISPONIBLE'))

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-card border border-ash-grey/60 transition-colors duration-150 hover:border-ash-grey sm:flex-row',
        cancelada && 'bg-pale-oak/[0.06]',
      )}
    >
      <Link to={`/propiedades/${v.propiedadId}`} className="shrink-0 focus-visible:outline-none" tabIndex={-1} aria-hidden="true">
        <PropertyPhoto
          src={p?.foto}
          alt=""
          className={cn('aspect-[16/9] w-full sm:aspect-[4/3] sm:h-full sm:w-60', cancelada && 'opacity-60 grayscale-[40%]')}
          imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-small text-muted-foreground">{relativeDay(inicio, nowInBogota())}</p>
            <p
              className={cn(
                'mt-1 font-display text-section font-semibold leading-none tabular-nums',
                cancelada ? 'text-ash-grey line-through decoration-1' : 'text-evergreen',
              )}
            >
              {formatRange(inicio, fin)}
            </p>
          </div>
          <Badge variant={ESTADO_VISITA_BADGE[v.estadoVisita] ?? 'outline'} dot className="shrink-0">
            {ESTADO_VISITA_LABELS[v.estadoVisita] ?? v.estadoVisita}
          </Badge>
        </div>

        <div className="min-w-0 space-y-1">
          <Link
            to={`/propiedades/${v.propiedadId}`}
            className="line-clamp-1 font-display text-subtitle font-semibold leading-tight text-evergreen underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {p?.titulo ?? (p?.missing ? 'Propiedad' : <span className="inline-block h-4 w-48 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
          </Link>
          {p?.direccion && (
            <p className="flex items-center gap-1.5 text-small text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">
                {p.direccion}
                {p.ciudad ? `, ${p.ciudad}` : ''}
              </span>
            </p>
          )}
          {noDisponible && <p className="text-small text-[#7a5824]">Propiedad no disponible</p>}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ash-grey/40 pt-4">
          <p className="flex min-w-0 items-center gap-2 text-small text-muted-foreground">
            <UserRound className="size-4 shrink-0 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">
              Con{' '}
              <Link
                to={`/agentes/${v.agenteId}`}
                state={{ nombre: v.nombreAgente }}
                className="font-medium text-evergreen underline-offset-4 hover:underline"
              >
                {agentName(v)}
              </Link>
            </span>
          </p>
          {programada && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="-mr-2 text-error hover:bg-error/[0.07]">
              <X strokeWidth={1.75} aria-hidden="true" />
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function VisitCardsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando visitas">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-card border border-ash-grey/50 sm:flex-row">
          <span className="aspect-[16/9] w-full animate-pulse bg-pale-oak/30 sm:aspect-[4/3] sm:w-60" />
          <div className="flex-1 space-y-3 p-6">
            <span className="block h-3 w-20 animate-pulse rounded-full bg-pale-oak/40" />
            <span className="block h-6 w-40 animate-pulse rounded-full bg-pale-oak/40" />
            <span className="block h-4 w-2/3 animate-pulse rounded-full bg-pale-oak/30" />
          </div>
        </div>
      ))}
    </div>
  )
}
