import { addDays, startOfDay, subDays } from 'date-fns'
import { CalendarDays, Check, ChevronLeft, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ESTADOS_LEAD, ESTADOS_LEAD_TERMINALES, cambiarEstadoLead, getLead } from '@/api/leadApi'
import { getPropiedad } from '@/api/propertyApi'
import { listMisVisitas } from '@/api/visitaApi'
import { useAuth } from '@/auth/auth-context'
import { ClientContact } from '@/components/lead/ClientContact'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/format'
import { MODALIDAD_FRASE, TIPO_LABELS, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'
import {
  CONFIRMAR_ESTADO_LEAD,
  ESTADO_LEAD_BADGE,
  ESTADO_LEAD_LABELS,
  ESTADO_VISITA_BADGE,
  ESTADO_VISITA_LABELS,
  formatRange,
  formatShortDay,
  leadErrorMessage,
  nowInBogota,
  parseLocal,
  toLocalDateTime,
} from '@/lib/visit'

/** Camino principal del pipeline; DESCARTADO puede llegar desde cualquier etapa. */
const PIPELINE = ESTADOS_LEAD.filter((e) => e !== 'DESCARTADO')

/**
 * Detalle de un lead (`GET /leads/{id}`, docs/leads-service.md §3): contacto del cliente, propiedad, visitas y
 * estado. Solo el agente asignado o un administrador central; el backend responde 403 a los demás.
 */
export default function LeadDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [toast, showToast] = useToast()
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [contractNotice, setContractNotice] = useState(false)

  const data = useAsync((signal) => getLead(id, { signal }), [id])
  const lead = data.data
  const propiedad = useAsync((signal) => (lead ? getPropiedad(lead.propiedadId, { signal }) : Promise.resolve(null)), [lead?.propiedadId])
  // Visitas del lead en la agenda del agente autenticado (mis-visitas filtra por agente; un admin ve las suyas).
  const visitas = useAsync(
    (signal) => {
      if (!lead || user.rol === 'ADMINISTRADOR_CENTRAL') return Promise.resolve([])
      const today = startOfDay(nowInBogota())
      const desde = startOfDay(parseLocal(lead.createdAt) ?? subDays(today, 90))
      return listMisVisitas({ signal, desde: toLocalDateTime(desde), hasta: toLocalDateTime(addDays(today, 90)) }).then((list) =>
        (list ?? []).filter((v) => v.leadId === lead.id),
      )
    },
    [lead?.id],
  )

  if (data.error && !lead) {
    const codigo = data.error.codigo
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink />
        {data.error.status === 404 || data.error.status === 400 ? (
          <Alert variant="warning">
            <p>Este lead no existe o el enlace está incompleto.</p>
          </Alert>
        ) : data.error.status === 403 || codigo === 'ACCESO_NO_AUTORIZADO' ? (
          <Alert variant="warning">
            <p>{leadErrorMessage({ codigo: 'ACCESO_NO_AUTORIZADO' })} Solo el agente a cargo o un administrador central pueden ver este lead.</p>
          </Alert>
        ) : (
          <LoadError error={{ ...data.error, mensaje: leadErrorMessage(data.error) }} onRetry={data.reload} />
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
      // 204 sin body: se vuelve a pedir el lead para mostrar lo que dice el servidor.
      const fresh = await getLead(lead.id)
      data.setData(fresh)
      if (nuevoEstado === 'OFERTA_ACEPTADA') setContractNotice(true)
      else showToast(`Estado actualizado a ${ESTADO_LEAD_LABELS[fresh?.estado ?? nuevoEstado].toLowerCase()}`)
      setNuevoEstado('')
    } catch (err) {
      // ESTADO_TERMINAL: el lead ya estaba cerrado o descartado; al recargar desaparece el selector.
      if (err?.codigo === 'ESTADO_TERMINAL') data.reload()
      throw Object.assign(err, { mensaje: leadErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  function solicitarCambio() {
    if (!nuevoEstado) return
    if (CONFIRMAR_ESTADO_LEAD[nuevoEstado]) setConfirming(true)
    else guardarEstado().catch(setSaveError)
  }

  return (
    <div className="max-w-6xl space-y-8">
      <BackLink />

      <header className="space-y-3 border-b border-ash-grey/50 pb-6">
        <Badge variant={ESTADO_LEAD_BADGE[lead.estado] ?? 'outline'} dot>
          {ESTADO_LEAD_LABELS[lead.estado] ?? lead.estado}
        </Badge>
        <h1 className="text-page leading-tight text-evergreen">{lead.nombreCliente || 'Cliente'}</h1>
        <p className="max-w-[75ch] text-muted-foreground">
          Interesado en {p?.titulo ?? 'la propiedad'}
          {lead.createdAt && ` · desde el ${formatDate(lead.createdAt, { dateStyle: 'long' })}`}
        </p>
      </header>

      {contractNotice && (
        <Alert variant="success">
          <p>Oferta aceptada. El borrador del contrato se está generando y estará disponible en Contratos en unos segundos.</p>
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="contacto" className="space-y-4">
            <h2 id="contacto" className="text-section leading-tight text-evergreen">
              Contacto
            </h2>
            <ClientContact lead={lead} />
          </section>

          <section aria-labelledby="propiedad-lead" className="space-y-4">
            <h2 id="propiedad-lead" className="text-section leading-tight text-evergreen">
              Propiedad
            </h2>
            {propiedad.error ? (
              <LoadError error={propiedad.error} onRetry={propiedad.reload} />
            ) : !p ? (
              <span className="block h-40 animate-pulse rounded-card bg-pale-oak/25" />
            ) : (
              <Link
                to={`/propiedades/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-card border border-ash-grey/60 transition-colors duration-150 hover:border-evergreen/40 sm:flex-row"
              >
                <PropertyPhoto
                  src={p.imagenes?.find((i) => i.esPortada)?.url ?? p.imagenes?.[0]?.url}
                  alt=""
                  className="aspect-[4/3] w-full shrink-0 sm:w-64"
                  imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
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

          {user.rol !== 'ADMINISTRADOR_CENTRAL' && (
            <section aria-labelledby="visitas-lead" className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="visitas-lead" className="text-section leading-tight text-evergreen">
                  Visitas
                </h2>
                <Link to="/panel/visitas" className="inline-flex items-center gap-1.5 text-small font-medium text-emerald-depths hover:text-evergreen hover:underline">
                  <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Abrir agenda
                </Link>
              </div>
              {visitas.error ? (
                <LoadError error={visitas.error} onRetry={visitas.reload} />
              ) : visitas.loading && !visitas.data ? (
                <span className="block h-24 animate-pulse rounded-card bg-pale-oak/25" />
              ) : visitas.data?.length ? (
                <ul className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60">
                  {visitas.data.map((v) => {
                    const inicio = parseLocal(v.fechaHora)
                    return (
                      <li key={v.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className={cn('font-medium tabular-nums', v.estadoVisita === 'CANCELADA' ? 'text-ash-grey line-through' : 'text-evergreen')}>
                            {formatRange(inicio, parseLocal(v.fechaHoraFin))}
                          </p>
                          <p className="text-small text-muted-foreground">{formatShortDay(inicio)}</p>
                        </div>
                        <Badge variant={ESTADO_VISITA_BADGE[v.estadoVisita] ?? 'outline'} dot>
                          {ESTADO_VISITA_LABELS[v.estadoVisita] ?? v.estadoVisita}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-card border border-dashed border-ash-grey px-5 py-6 text-small text-muted-foreground">
                  Este lead no tiene visitas recientes en tu agenda. El cliente puede agendar otra desde su cuenta.
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6 rounded-card bg-pale-oak/25 p-6">
            <h2 className="font-display text-subtitle font-semibold text-evergreen">Pipeline</h2>
            <Pipeline estado={lead.estado} />

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
                {nuevoEstado === 'OFERTA_ACEPTADA' && (
                  <p className="text-meta text-muted-foreground">Al guardar se generará el borrador del contrato.</p>
                )}
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
        title={CONFIRMAR_ESTADO_LEAD[nuevoEstado]?.title}
        description={CONFIRMAR_ESTADO_LEAD[nuevoEstado]?.text}
        confirmLabel="Actualizar estado"
        destructive={CONFIRMAR_ESTADO_LEAD[nuevoEstado]?.destructive}
        onConfirm={guardarEstado}
      />
      {toast}
    </div>
  )
}

/** Etapas del pipeline: completadas con check, la actual resaltada. DESCARTADO atenúa todo el camino. */
function Pipeline({ estado }) {
  const descartado = estado === 'DESCARTADO'
  const current = PIPELINE.indexOf(estado)
  return (
    <ol>
      {PIPELINE.map((e, i) => {
        const done = !descartado && i < current
        const active = !descartado && i === current
        return (
          <li key={e} className="relative flex items-center gap-3 pb-4 last:pb-0">
            {i < PIPELINE.length - 1 && (
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
      Pipeline de leads
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
