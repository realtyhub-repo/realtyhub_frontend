import { addDays, startOfDay, subDays } from 'date-fns'
import { Check, ChevronLeft, ExternalLink, Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ESTADOS_LEAD, ESTADOS_LEAD_TERMINALES, cambiarEstadoLead, getLead } from '@/api/leadApi'
import { getPropiedad } from '@/api/propertyApi'
import { listMisVisitas } from '@/api/visitaApi'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { VisitList } from '@/components/visit/VisitList'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/format'
import { MODALIDAD_FRASE, TIPO_LABELS, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'
import { ESTADO_LEAD_BADGE, ESTADO_LEAD_LABELS, nowInBogota, parseLocal, toLocalDateTime } from '@/lib/visit'

/** Camino principal del embudo; DESCARTADO puede llegar desde cualquier etapa. */
const EMBUDO = ESTADOS_LEAD.filter((e) => e !== 'DESCARTADO')

/** Cambios que merecen confirmación: los terminales no se pueden deshacer y OFERTA_ACEPTADA genera el contrato. */
const CONFIRMAR = {
  CERRADO: 'El lead quedará cerrado y ya no se podrá modificar.',
  DESCARTADO: 'El lead quedará descartado y ya no se podrá modificar.',
  OFERTA_ACEPTADA: 'Se generará el borrador del contrato para este cliente y esta propiedad.',
}

/**
 * Detalle de un lead (`GET /leads/{id}`): datos de contacto del cliente, propiedad, visitas y estado del embudo.
 * Solo el agente dueño o un administrador (docs/lead-service.md); el backend responde 403 a los demás.
 */
export default function LeadDetailPage() {
  const { id } = useParams()
  const [toast, showToast] = useToast()
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const data = useAsync((signal) => getLead(id, { signal }), [id])
  const lead = data.data
  const propiedad = useAsync((signal) => (lead ? getPropiedad(lead.propiedadId, { signal }) : Promise.resolve(null)), [lead?.propiedadId])
  const visitas = useAsync(
    (signal) => {
      if (!lead) return Promise.resolve([])
      const desde = lead.createdAt ? startOfDay(parseLocal(lead.createdAt) ?? nowInBogota()) : subDays(startOfDay(nowInBogota()), 90)
      return listMisVisitas({ signal, desde: toLocalDateTime(desde), hasta: toLocalDateTime(addDays(startOfDay(nowInBogota()), 120)) }).then(
        (list) => (list ?? []).filter((v) => v.leadId === lead.id),
      )
    },
    [lead?.id],
  )

  if (data.error && !lead) {
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink />
        {data.error.status === 404 || data.error.status === 400 ? (
          <Alert variant="warning">
            <p>Este lead no existe o el enlace está incompleto.</p>
          </Alert>
        ) : data.error.status === 403 ? (
          <Alert variant="warning">
            <p>Este lead está asignado a otro agente. Solo el agente a cargo o un administrador central pueden verlo.</p>
          </Alert>
        ) : (
          <LoadError error={data.error} onRetry={data.reload} />
        )}
      </div>
    )
  }
  if (!lead) return <DetailSkeleton />

  const p = propiedad.data
  const terminal = ESTADOS_LEAD_TERMINALES.includes(lead.estado)

  async function guardarEstado() {
    setSaving(true)
    setSaveError(null)
    try {
      await cambiarEstadoLead(lead.id, nuevoEstado)
      data.setData((l) => ({ ...l, estado: nuevoEstado }))
      showToast(`Estado actualizado a ${ESTADO_LEAD_LABELS[nuevoEstado].toLowerCase()}`)
      setNuevoEstado('')
    } finally {
      setSaving(false)
    }
  }

  function solicitarCambio() {
    if (!nuevoEstado) return
    if (CONFIRMAR[nuevoEstado]) setConfirming(true)
    else guardarEstado().catch(setSaveError)
  }

  return (
    <div className="max-w-6xl space-y-8">
      <BackLink />

      <header className="flex flex-col gap-4 border-b border-ash-grey/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant={ESTADO_LEAD_BADGE[lead.estado] ?? 'outline'} dot>
            {ESTADO_LEAD_LABELS[lead.estado] ?? lead.estado}
          </Badge>
          <h1 className="text-page leading-tight text-evergreen">{lead.nombreCliente ?? 'Cliente'}</h1>
          <p className="text-muted-foreground">
            Interesado en {p?.titulo ?? 'la propiedad'}
            {lead.createdAt && ` · desde el ${formatDate(lead.createdAt, { dateStyle: 'long' })}`}
          </p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="contacto" className="space-y-4">
            <h2 id="contacto" className="text-section leading-tight text-evergreen">
              Contacto
            </h2>
            <div className="flex flex-col gap-5 rounded-card border border-ash-grey/60 p-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar name={lead.nombreCliente ?? ''} className="size-12 text-body" />
                <div className="min-w-0">
                  <p className="truncate font-display text-subtitle font-semibold leading-tight text-evergreen">{lead.nombreCliente ?? 'Sin nombre'}</p>
                  <p className="text-small text-muted-foreground">Cliente</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {lead.telefonoCliente && (
                  <a href={`tel:${lead.telefonoCliente}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <Phone strokeWidth={1.75} aria-hidden="true" />
                    {lead.telefonoCliente}
                  </a>
                )}
                {lead.emailCliente && (
                  <a href={`mailto:${lead.emailCliente}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <Mail strokeWidth={1.75} aria-hidden="true" />
                    {lead.emailCliente}
                  </a>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="visitas-lead" className="space-y-4">
            <h2 id="visitas-lead" className="text-section leading-tight text-evergreen">
              Visitas
            </h2>
            {visitas.error ? (
              <LoadError error={visitas.error} onRetry={visitas.reload} />
            ) : visitas.loading && !visitas.data ? (
              <ListSkeleton rows={2} />
            ) : visitas.data?.length ? (
              <VisitList
                visitas={visitas.data}
                showProperty={false}
                onChanged={(updated, estado) => {
                  visitas.setData((list) => list.map((v) => (v.id === updated.id ? updated : v)))
                  showToast(estado === 'REALIZADA' ? 'Visita marcada como realizada' : 'Visita cancelada')
                }}
              />
            ) : (
              <EmptyState title="Este lead no tiene visitas en tu agenda" text="El cliente puede agendar otra visita desde su cuenta." />
            )}
          </section>

          <section aria-labelledby="propiedad-lead" className="space-y-4">
            <h2 id="propiedad-lead" className="text-section leading-tight text-evergreen">
              Propiedad
            </h2>
            {propiedad.error ? (
              <LoadError error={propiedad.error} onRetry={propiedad.reload} />
            ) : !p ? (
              <span className="block h-32 animate-pulse rounded-card bg-pale-oak/25" />
            ) : (
              <Link
                to={`/propiedades/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-card border border-ash-grey/60 transition-colors duration-150 hover:border-evergreen/40 sm:flex-row"
              >
                <PropertyPhoto
                  src={p.imagenes?.find((i) => i.esPortada)?.url ?? p.imagenes?.[0]?.url}
                  alt=""
                  className="aspect-[4/3] w-full shrink-0 sm:w-56"
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-5">
                  <p className="text-small font-medium text-emerald-depths">
                    {TIPO_LABELS[p.tipoPropiedad]} {MODALIDAD_FRASE[p.modalidad]}
                  </p>
                  <p className="font-display text-subtitle font-semibold leading-tight text-evergreen">{p.titulo}</p>
                  <p className="text-small text-muted-foreground">
                    {p.direccion}
                    {p.ciudad ? `, ${p.ciudad}` : ''}
                  </p>
                  <p className="mt-2 flex items-center gap-2 font-medium text-evergreen tabular-nums">
                    {formatPrice(p.precio)}
                    {p.modalidad === 'ALQUILER' && <span className="font-normal text-muted-foreground">/mes</span>}
                    <ExternalLink className="ml-auto size-4 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
                  </p>
                </div>
              </Link>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6 rounded-card bg-pale-oak/25 p-6">
            <h2 className="font-display text-subtitle font-semibold text-evergreen">Embudo</h2>
            <Funnel estado={lead.estado} />

            {terminal ? (
              <p className="border-t border-evergreen/10 pt-5 text-small text-muted-foreground">
                Este lead está {ESTADO_LEAD_LABELS[lead.estado].toLowerCase()} y ya no se puede modificar.
              </p>
            ) : (
              <div className="space-y-3 border-t border-evergreen/10 pt-5">
                <label htmlFor="nuevo-estado" className="text-small font-medium text-evergreen">
                  Cambiar estado
                </label>
                <Select
                  id="nuevo-estado"
                  value={nuevoEstado}
                  onChange={(e) => {
                    setNuevoEstado(e.target.value)
                    setSaveError(null)
                  }}
                >
                  <option value="">Elige el nuevo estado</option>
                  {ESTADOS_LEAD.filter((e) => e !== lead.estado).map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_LEAD_LABELS[e]}
                    </option>
                  ))}
                </Select>
                {saveError && (
                  <Alert variant="error">
                    <p>{saveError.mensaje}</p>
                  </Alert>
                )}
                <Button className="w-full" onClick={solicitarCambio} disabled={!nuevoEstado} loading={saving && !confirming}>
                  Actualizar estado
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Pasar a ${ESTADO_LEAD_LABELS[nuevoEstado]?.toLowerCase() ?? ''}`}
        description={CONFIRMAR[nuevoEstado]}
        confirmLabel="Actualizar estado"
        destructive={nuevoEstado === 'DESCARTADO'}
        onConfirm={guardarEstado}
      />
      {toast}
    </div>
  )
}

/** Etapas del embudo: completadas con check, la actual resaltada. DESCARTADO atenúa todo el camino. */
function Funnel({ estado }) {
  const descartado = estado === 'DESCARTADO'
  const current = EMBUDO.indexOf(estado)
  return (
    <ol className="space-y-0">
      {EMBUDO.map((e, i) => {
        const done = !descartado && i < current
        const active = !descartado && i === current
        return (
          <li key={e} className="relative flex items-center gap-3 pb-4 last:pb-0">
            {i < EMBUDO.length - 1 && (
              <span className={cn('absolute left-[11px] top-6 h-[calc(100%-16px)] w-px', done ? 'bg-evergreen' : 'bg-ash-grey/70')} aria-hidden="true" />
            )}
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-meta',
                done && 'border-evergreen bg-evergreen text-floral-white',
                active && 'border-evergreen bg-floral-white ring-4 ring-evergreen/10',
                !done && !active && 'border-ash-grey bg-floral-white',
              )}
            >
              {done && <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />}
              {active && <span className="size-2 rounded-full bg-evergreen" aria-hidden="true" />}
            </span>
            <span className={cn('text-small', active ? 'font-medium text-evergreen' : done ? 'text-evergreen' : 'text-muted-foreground')}>
              {ESTADO_LEAD_LABELS[e]}
              {active && <span className="sr-only"> (estado actual)</span>}
            </span>
          </li>
        )
      })}
      {descartado && (
        <li className="mt-4 flex items-center gap-3 border-t border-evergreen/10 pt-4">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-error bg-error/10">
            <span className="size-2 rounded-full bg-error" aria-hidden="true" />
          </span>
          <span className="text-small font-medium text-error">Descartado</span>
        </li>
      )}
    </ol>
  )
}

function BackLink() {
  return (
    <Link to="/panel/leads" className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen">
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Todos los leads
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl space-y-8" role="status" aria-label="Cargando lead">
      <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
      <div className="space-y-3 border-b border-ash-grey/50 pb-6">
        <span className="block h-5 w-24 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-8 w-72 animate-pulse rounded-full bg-pale-oak/40" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <span className="block h-64 animate-pulse rounded-card bg-pale-oak/25" />
        <span className="block h-72 animate-pulse rounded-card bg-pale-oak/25" />
      </div>
    </div>
  )
}
