import { CalendarClock, Contact, GripVertical, MoreHorizontal, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ESTADOS_LEAD, ESTADOS_LEAD_TERMINALES, cambiarEstadoLead, listMisLeads } from '@/api/leadApi'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { PageHeader } from '@/components/panel/PageHeader'
import { Segmented } from '@/components/panel/Segmented'
import { EmptyState, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { cn } from '@/lib/utils'
import {
  CONFIRMAR_ESTADO_LEAD,
  ESTADO_LEAD_BADGE,
  ESTADO_LEAD_LABELS,
  formatDayMonth, formatHour,
  formatShortDay,
  leadErrorMessage,
  parseLocal,
} from '@/lib/visit'

/** Columnas del tablero: los estados activos, en orden. CERRADO y DESCARTADO van en "Finalizados". */
const COLUMNAS = ESTADOS_LEAD.filter((e) => !ESTADOS_LEAD_TERMINALES.includes(e))

/**
 * Pipeline de leads del agente (docs/leads-service.md §2): `GET /leads/mis-leads` en un tablero por estado.
 * Se cambia de estado arrastrando la tarjeta o desde su menú (`PUT /leads/{id}/estado` → 204); después se
 * vuelve a pedir la lista para mostrar lo que dice el servidor.
 */
export default function LeadsPage() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'finalizados' ? 'finalizados' : 'pipeline'
  const [toast, showToast] = useToast()
  const [moving, setMoving] = useState(null) // { id, estado } mientras el PUT está en curso
  const [confirm, setConfirm] = useState(null) // { lead, estado }
  const [notice, setNotice] = useState(null) // { kind, text }
  const [dragOver, setDragOver] = useState(null)

  const result = useAsync((signal) => listMisLeads({ signal }), [])
  const leads = useMemo(() => result.data ?? [], [result.data])
  const propiedades = usePropertySummaries(leads.map((l) => l.propiedadId))

  // Mientras se mueve, la tarjeta se muestra ya en su columna destino (con indicador de carga).
  const shown = useMemo(() => leads.map((l) => (moving?.id === l.id ? { ...l, estado: moving.estado } : l)), [leads, moving])
  const byEstado = useMemo(() => Object.fromEntries(ESTADOS_LEAD.map((e) => [e, sortByVisit(shown.filter((l) => l.estado === e))])), [shown])
  const finalizados = useMemo(() => sortByVisit(shown.filter((l) => ESTADOS_LEAD_TERMINALES.includes(l.estado))), [shown])
  const activos = shown.length - finalizados.length

  function request(lead, estado) {
    if (!lead || lead.estado === estado || moving) return
    if (CONFIRMAR_ESTADO_LEAD[estado]) setConfirm({ lead, estado })
    else move(lead, estado).catch(() => {})
  }

  /** `inDialog`: el error lo muestra el ConfirmDialog, no el aviso de la página. */
  async function move(lead, estado, { inDialog = false } = {}) {
    setMoving({ id: lead.id, estado })
    setNotice(null)
    try {
      await cambiarEstadoLead(lead.id, estado)
      const fresh = await listMisLeads()
      result.setData(fresh)
      if (estado === 'OFERTA_ACEPTADA') {
        setNotice({ kind: 'success', text: 'Oferta aceptada. El borrador del contrato se está generando y estará listo en Contratos en unos segundos.' })
      } else {
        showToast(`Lead movido a ${ESTADO_LEAD_LABELS[estado].toLowerCase()}`)
      }
    } catch (err) {
      // ESTADO_TERMINAL: el lead ya estaba cerrado o descartado en el servidor; se recarga para reflejarlo.
      result.reload()
      const text = leadErrorMessage(err)
      if (!inDialog) setNotice({ kind: 'error', text })
      throw Object.assign(err, { mensaje: text })
    } finally {
      setMoving(null)
    }
  }

  function setVista(v) {
    setParams(v === 'finalizados' ? { vista: v } : {}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Clientes interesados en una propiedad que te fueron asignados al agendar una visita. Arrastra cada tarjeta, o usa su menú, para avanzar en el pipeline."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Vista"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'pipeline', label: 'Pipeline', count: result.data ? activos : undefined },
            { value: 'finalizados', label: 'Finalizados', count: result.data ? finalizados.length : undefined },
          ]}
        />
        {result.loading && result.data && <p className="text-meta text-muted-foreground" role="status">Actualizando…</p>}
      </div>

      {notice && (
        <Alert variant={notice.kind}>
          <p>{notice.text}</p>
        </Alert>
      )}

      {result.error && !result.data ? (
        <LoadError error={{ ...result.error, mensaje: leadErrorMessage(result.error) }} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <BoardSkeleton />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="Aún no tienes leads"
          text="Cuando un cliente agende una visita a una propiedad y se te asigne, el lead aparecerá aquí."
        />
      ) : vista === 'finalizados' ? (
        <FinishedList leads={finalizados} propiedades={propiedades} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          <ol className="flex min-w-max gap-4" aria-label="Pipeline de leads">
            {COLUMNAS.map((estado) => (
              <li
                key={estado}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOver !== estado) setDragOver(estado)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(null)
                  request(leads.find((l) => l.id === e.dataTransfer.getData('text/plain')), estado)
                }}
                className={cn(
                  'flex w-[288px] shrink-0 flex-col rounded-card border bg-pale-oak/[0.12] transition-[border-color,background-color] duration-150',
                  dragOver === estado ? 'border-dashed border-emerald-depths bg-pale-oak/25' : 'border-transparent',
                )}
              >
                <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
                  <h2 className="font-display text-body font-semibold text-evergreen">{ESTADO_LEAD_LABELS[estado]}</h2>
                  <span className="text-small text-muted-foreground tabular-nums">{byEstado[estado].length}</span>
                </header>
                <ul className="flex min-h-32 flex-1 flex-col gap-2 px-2 pb-2">
                  {byEstado[estado].map((lead) => (
                    <li key={lead.id}>
                      <LeadCard lead={lead} propiedad={propiedades[lead.propiedadId]} pending={moving?.id === lead.id} disabled={!!moving} onMove={(e) => request(lead, e)} />
                    </li>
                  ))}
                  {byEstado[estado].length === 0 && (
                    <li className="flex flex-1 items-center justify-center rounded-control border border-dashed border-ash-grey/60 px-4 py-6 text-center text-meta text-muted-foreground">
                      Sin leads en esta etapa
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={CONFIRMAR_ESTADO_LEAD[confirm?.estado]?.title}
        description={CONFIRMAR_ESTADO_LEAD[confirm?.estado]?.text}
        confirmLabel={confirm?.estado === 'DESCARTADO' ? 'Descartar lead' : confirm?.estado === 'CERRADO' ? 'Cerrar lead' : 'Pasar a oferta aceptada'}
        destructive={CONFIRMAR_ESTADO_LEAD[confirm?.estado]?.destructive}
        onConfirm={() => move(confirm.lead, confirm.estado, { inDialog: true })}
      />
      {toast}
    </div>
  )
}

/** Visita más próxima primero; los leads sin visita al final. */
function sortByVisit(list) {
  return [...list].sort((a, b) => (a.fechaHoraVisita ?? '9999').localeCompare(b.fechaHoraVisita ?? '9999'))
}

function LeadCard({ lead, propiedad: p, pending, disabled, onMove }) {
  const navigate = useNavigate()
  const visita = parseLocal(lead.fechaHoraVisita)
  const [dragging, setDragging] = useState(false)

  return (
    <article
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => navigate(`/panel/leads/${lead.id}`)}
      className={cn(
        'group relative cursor-pointer rounded-control border border-ash-grey/60 bg-floral-white p-3 transition-[border-color,opacity,box-shadow] duration-150 hover:border-ash-grey hover:shadow-[0_1px_2px_rgb(10_59_53/0.06)]',
        dragging && 'opacity-40',
        pending && 'pointer-events-none animate-pulse',
      )}
    >
      <div className="flex gap-3">
        <PropertyPhoto src={p?.foto} alt="" label="" className="aspect-[4/3] w-[72px] shrink-0 rounded-[4px]" />
        <div className="min-w-0 flex-1 pr-6">
          <Link
            to={`/panel/leads/${lead.id}`}
            onClick={(e) => e.stopPropagation()}
            className="line-clamp-2 text-small font-medium leading-snug text-evergreen focus-visible:underline focus-visible:outline-none"
          >
            {p?.titulo ?? (p?.missing ? 'Propiedad no disponible' : <span className="inline-block h-3 w-32 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
          </Link>
          {p?.ciudad && <p className="mt-0.5 truncate text-meta text-muted-foreground">{p.ciudad}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ash-grey/40 pt-2.5">
        <p className="flex items-center gap-1.5 text-meta text-muted-foreground tabular-nums">
          <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {visita ? `${formatDayMonth(visita)} · ${formatHour(visita)}` : 'Sin visita agendada'}
        </p>
        <GripVertical className="size-4 shrink-0 text-ash-grey/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-control text-ash-grey transition-colors duration-150 hover:bg-pale-oak/30 hover:text-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-pale-oak/30 data-[state=open]:text-evergreen"
          aria-label="Cambiar estado del lead"
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Mover a</DropdownMenuLabel>
          {COLUMNAS.map((e) => (
            <DropdownMenuCheckItem key={e} checked={lead.estado === e} disabled={lead.estado === e} onSelect={() => onMove(e)}>
              {ESTADO_LEAD_LABELS[e]}
            </DropdownMenuCheckItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onMove('CERRADO')}>
            <span className="size-4" aria-hidden="true" />
            Cerrar lead
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => onMove('DESCARTADO')}>
            <span className="size-4" aria-hidden="true" />
            Descartar lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )
}

function FinishedList({ leads, propiedades }) {
  const navigate = useNavigate()
  if (!leads.length) {
    return <EmptyState icon={Search} title="No tienes leads finalizados" text="Los leads cerrados o descartados aparecerán aquí." />
  }
  return (
    <div className="max-w-5xl overflow-hidden rounded-card border border-ash-grey/60">
      <table className="w-full text-left text-small">
        <thead className="border-b border-ash-grey/60 bg-pale-oak/15 text-meta text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Propiedad</th>
            <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Última visita</th>
            <th scope="col" className="px-5 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ash-grey/40">
          {leads.map((l) => {
            const p = propiedades[l.propiedadId]
            const visita = parseLocal(l.fechaHoraVisita)
            return (
              <tr key={l.id} onClick={() => navigate(`/panel/leads/${l.id}`)} className="cursor-pointer transition-colors duration-150 hover:bg-pale-oak/10">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    <PropertyPhoto src={p?.foto} alt="" label="" className="aspect-[4/3] w-16 shrink-0 rounded-[4px] opacity-90" />
                    <div className="min-w-0">
                      <Link
                        to={`/panel/leads/${l.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="line-clamp-1 font-medium text-evergreen focus-visible:underline focus-visible:outline-none"
                      >
                        {p?.titulo ?? (p?.missing ? 'Propiedad no disponible' : <span className="inline-block h-3 w-40 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
                      </Link>
                      <p className="text-muted-foreground">{p?.ciudad}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 text-muted-foreground tabular-nums sm:table-cell">
                  {visita ? `${formatShortDay(visita)} · ${formatHour(visita)}` : 'Sin visita'}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={ESTADO_LEAD_BADGE[l.estado] ?? 'outline'} dot>
                    {ESTADO_LEAD_LABELS[l.estado] ?? l.estado}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Cargando leads">
      {COLUMNAS.map((e, i) => (
        <div key={e} className="w-[288px] shrink-0 space-y-2 rounded-card bg-pale-oak/[0.12] p-2 pt-4">
          <span className="mx-2 mb-3 block h-4 w-28 animate-pulse rounded-full bg-pale-oak/40" />
          {Array.from({ length: 3 - (i % 2) }, (_, j) => (
            <span key={j} className="block h-[104px] animate-pulse rounded-control bg-pale-oak/25" />
          ))}
        </div>
      ))}
    </div>
  )
}
