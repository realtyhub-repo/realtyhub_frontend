import { CircleCheck, Contact, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { getLead } from '@/api/leadApi'
import { cambiarEstadoVisita } from '@/api/visitaApi'
import { ClientContact } from '@/components/lead/ClientContact'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'
import {
  ESTADO_LEAD_LABELS,
  ESTADO_VISITA_BADGE,
  ESTADO_VISITA_LABELS,
  formatRange,
  hasStarted,
  parseLocal,
  relativeDay,
  visitaErrorMessage,
} from '@/lib/visit'

/**
 * Detalle de una visita de la agenda (docs/visits-service.md §3): propiedad, cliente (desde `GET /leads/{leadId}`)
 * y acciones. "Marcar como realizada" solo cuando la hora de inicio ya pasó; las finales no ofrecen acciones.
 * `onUpdated(visita)` recibe la respuesta del PATCH; `onStale()` pide recargar si el servidor dice que cambió.
 */
export function VisitDetailSheet({ visita, propiedad, onOpenChange, onUpdated, onStale }) {
  return (
    <Dialog open={!!visita} onOpenChange={onOpenChange}>
      <DialogContent side="right">
        {visita && <SheetBody key={visita.id} visita={visita} propiedad={propiedad} onUpdated={onUpdated} onStale={onStale} />}
      </DialogContent>
    </Dialog>
  )
}

function SheetBody({ visita: v, propiedad: p, onUpdated, onStale }) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)
  const lead = useAsync((signal) => getLead(v.leadId, { signal }), [v.leadId])
  const inicio = parseLocal(v.fechaHora)
  const programada = v.estadoVisita === 'PROGRAMADA'
  const started = hasStarted(v)

  async function change(nuevoEstado) {
    setPending(nuevoEstado)
    setError(null)
    try {
      const updated = await cambiarEstadoVisita(v.id, nuevoEstado)
      setConfirmCancel(false)
      onUpdated?.(updated ?? { ...v, estadoVisita: nuevoEstado }, nuevoEstado)
    } catch (err) {
      setError(visitaErrorMessage(err))
      if (err?.codigo === 'TRANSICION_INVALIDA' || err?.codigo === 'VISITA_NO_ENCONTRADA') onStale?.()
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <header className="border-b border-ash-grey/50 px-6 pb-6 pt-8">
        <Badge variant={ESTADO_VISITA_BADGE[v.estadoVisita] ?? 'outline'} dot>
          {ESTADO_VISITA_LABELS[v.estadoVisita] ?? v.estadoVisita}
        </Badge>
        <DialogTitle className="mt-3 text-small font-normal text-muted-foreground">{relativeDay(inicio)}</DialogTitle>
        <p
          className={cn(
            'mt-1 font-display text-page font-semibold leading-none tabular-nums',
            v.estadoVisita === 'CANCELADA' ? 'text-ash-grey line-through decoration-2' : 'text-evergreen',
          )}
        >
          {formatRange(inicio, parseLocal(v.fechaHoraFin))}
        </p>
        <DialogDescription className="sr-only">Detalle de la visita y acciones disponibles</DialogDescription>
      </header>

      <div className="flex-1 space-y-8 px-6 py-6">
        <section aria-labelledby="visita-propiedad" className="space-y-3">
          <h3 id="visita-propiedad" className="text-small font-medium text-muted-foreground">
            Propiedad
          </h3>
          <Link
            to={`/propiedades/${v.propiedadId}`}
            className="group block overflow-hidden rounded-card border border-ash-grey/60 transition-colors duration-150 hover:border-evergreen/40"
          >
            <PropertyPhoto src={p?.foto} alt="" className="aspect-[16/9] w-full" imgClassName="transition-transform duration-200 group-hover:scale-[1.02]" />
            <div className="space-y-1 p-4">
              <p className="font-display text-subtitle font-semibold leading-tight text-evergreen">
                {p?.titulo ?? (p?.missing ? 'Propiedad no disponible' : <span className="inline-block h-4 w-48 animate-pulse rounded-full bg-pale-oak/40" />)}
              </p>
              {p?.direccion && (
                <p className="flex items-center gap-1.5 text-small text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="truncate">
                    {p.direccion}
                    {p.ciudad ? `, ${p.ciudad}` : ''}
                  </span>
                </p>
              )}
              {p?.precio > 0 && (
                <p className="text-small font-medium text-evergreen tabular-nums">
                  {formatPrice(p.precio)}
                  {p.modalidad === 'ALQUILER' && <span className="font-normal text-muted-foreground"> /mes</span>}
                </p>
              )}
            </div>
          </Link>
        </section>

        <section aria-labelledby="visita-cliente" className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="visita-cliente" className="text-small font-medium text-muted-foreground">
              Cliente
            </h3>
            {lead.data && (
              <Link to={`/panel/leads/${v.leadId}`} className="inline-flex items-center gap-1.5 text-small font-medium text-emerald-depths hover:text-evergreen hover:underline">
                <Contact className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Lead · {ESTADO_LEAD_LABELS[lead.data.estado] ?? lead.data.estado}
              </Link>
            )}
          </div>
          {lead.error ? (
            <p className="rounded-card border border-dashed border-ash-grey px-4 py-5 text-small text-muted-foreground">
              {lead.error.status === 403 ? 'Los datos del cliente solo los ve el agente a cargo del lead.' : 'No pudimos cargar los datos del cliente.'}
              {lead.error.status !== 403 && (
                <button type="button" onClick={lead.reload} className="ml-1 font-medium text-emerald-depths hover:underline">
                  Reintentar
                </button>
              )}
            </p>
          ) : lead.loading ? (
            <span className="block h-40 animate-pulse rounded-card bg-pale-oak/25" role="status" aria-label="Cargando cliente" />
          ) : (
            <ClientContact lead={lead.data} compact />
          )}
        </section>
      </div>

      {programada && (
        <footer className="sticky bottom-0 space-y-3 border-t border-ash-grey/50 bg-floral-white px-6 py-5">
          {error && (
            <Alert variant="error">
              <p>{error}</p>
            </Alert>
          )}
          {confirmCancel ? (
            <div className="space-y-3">
              <p className="text-small text-evergreen">¿Cancelar esta visita? El cliente verá la visita como cancelada y la hora quedará libre.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(false)} disabled={!!pending}>
                  Volver
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => change('CANCELADA')} loading={pending === 'CANCELADA'}>
                  Cancelar visita
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => change('REALIZADA')} disabled={!started || !!pending} loading={pending === 'REALIZADA'}>
                  {pending !== 'REALIZADA' && <CircleCheck strokeWidth={1.75} aria-hidden="true" />}
                  Marcar como realizada
                </Button>
                <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={!!pending}>
                  <X strokeWidth={1.75} aria-hidden="true" />
                  Cancelar
                </Button>
              </div>
              {!started && <p className="text-meta text-muted-foreground">Podrás marcarla como realizada cuando llegue la hora de inicio.</p>}
            </>
          )}
        </footer>
      )}
      {!programada && (
        <footer className="border-t border-ash-grey/50 px-6 py-5">
          <Link to={`/panel/leads/${v.leadId}`} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
            Ver lead
          </Link>
        </footer>
      )}
    </>
  )
}
