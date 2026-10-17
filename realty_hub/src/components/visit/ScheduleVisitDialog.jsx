import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'
import { CalendarCheck, Clock, Phone, RotateCw, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { agendarOtraVisita, crearLead } from '@/api/leadApi'
import { getMe, updateMe } from '@/api/userApi'
import { listMisVisitas } from '@/api/visitaApi'
import { Field } from '@/components/auth/Field'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import {
  DIAS_AGENDABLES,
  agentName,
  formatRange,
  nowInBogota,
  parseLocal,
  relativeDay,
  scheduleErrorInfo,
  toLocalDateTime,
} from '@/lib/visit'
import { VisitSlotPicker } from './VisitSlotPicker'

const PHONE_RE = /^[+\d][\d\s()-]{6,}$/

/**
 * Agendar una visita (docs/leads-service.md §1 y §4).
 * - Sin `leadId`: crea el lead (`POST /leads`) y el backend asigna un agente libre a esa hora.
 * - Con `leadId`: otra visita sobre un lead existente (`POST /leads/{id}/visitas`), con el mismo agente.
 * El teléfono es obligatorio solo en el frontend: si falta o cambia se guarda con `PUT /users/me` antes de agendar.
 */
export function ScheduleVisitDialog({ open, onOpenChange, propiedad, leadId, onScheduled }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-32px)] max-w-3xl overflow-y-auto">
        {open && <ScheduleForm propiedad={propiedad} initialLeadId={leadId} onScheduled={onScheduled} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

/** Montado solo mientras el diálogo está abierto: cada apertura arranca limpia. */
function ScheduleForm({ propiedad, initialLeadId, onScheduled, onClose }) {
  const [leadId, setLeadId] = useState(initialLeadId ?? null)
  const [fechaHora, setFechaHora] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [phone, setPhone] = useState(null) // null = aún no editado: se muestra el guardado
  const [phoneError, setPhoneError] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const me = useAsync((signal) => getMe({ signal }), [])
  const savedPhone = me.data?.telefono?.trim() ?? ''
  const phoneValue = phone ?? savedPhone
  const inicio = parseLocal(fechaHora)

  async function submit() {
    if (!fechaHora || pending) return
    const tel = phoneValue.trim()
    const telError = !tel ? 'Ingresa un teléfono para que el agente pueda contactarte' : !PHONE_RE.test(tel) ? 'Ingresa un teléfono válido' : null
    setPhoneError(telError)
    if (telError) return

    setPending(true)
    setError(null)
    try {
      if (tel !== savedPhone) {
        // `nombre` es obligatorio en ActualizarPerfilRequest; se reenvía el actual para no alterarlo.
        await updateMe({ nombre: me.data.nombre, telefono: tel })
        me.setData((m) => ({ ...m, telefono: tel }))
        setPhone(null)
      }
    } catch (err) {
      setPhoneError(err.mensaje)
      setPending(false)
      return
    }
    try {
      const lead = leadId ? await agendarOtraVisita(leadId, fechaHora) : await crearLead(propiedad.id, fechaHora)
      setDone(lead)
      onScheduled?.(lead)
    } catch (err) {
      const info = scheduleErrorInfo(err)
      if (info.duplicate) info.existing = await findExistingLead(propiedad.id)
      setError(info)
      if (info.retrySlot) {
        setFechaHora(null)
        setRefreshKey((k) => k + 1)
      }
    } finally {
      setPending(false)
    }
  }

  if (done) return <Scheduled lead={done} fallbackInicio={inicio} titulo={propiedad.titulo} onClose={onClose} />

  return (
    <>
      <DialogHeader>
        <DialogTitle>{leadId ? 'Agendar otra visita' : 'Agendar visita'}</DialogTitle>
        <DialogDescription className="max-w-[60ch]">
          {propiedad.titulo}. Cada visita dura una hora, entre las 8:00 y las 18:00 (hora de Colombia).
          {leadId ? ' Te atiende el mismo agente de tu solicitud.' : ' Te asignamos un agente libre a la hora que elijas.'}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6">
        <VisitSlotPicker propiedadId={propiedad.id} value={fechaHora} onChange={setFechaHora} refreshKey={refreshKey} disabled={pending} />
      </div>

      <div className="mt-8 border-t border-ash-grey/50 pt-6">
        {me.loading && !me.data ? (
          <span className="block h-[76px] w-full max-w-sm animate-pulse rounded-control bg-pale-oak/25" role="status" aria-label="Cargando teléfono" />
        ) : (
          <div className="max-w-sm">
            <Field
              id="telefono-visita"
              label="Teléfono de contacto"
              error={phoneError}
              hint={
                <p className="text-meta text-muted-foreground">
                  {savedPhone ? 'El agente te escribirá a este número para confirmar.' : 'Aún no tienes un teléfono guardado. Lo guardaremos en tu perfil.'}
                </p>
              }
            >
              {(props) => (
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
                  <Input
                    {...props}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+57 300 123 4567"
                    value={phoneValue}
                    disabled={pending}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      setPhoneError(null)
                    }}
                    className="pl-9"
                  />
                </div>
              )}
            </Field>
          </div>
        )}
      </div>

      {error?.text && <ScheduleError error={error} onRetry={submit} onUseLead={(id) => { setLeadId(id); setError(null) }} pending={pending} />}

      <DialogFooter className="items-stretch sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-small text-muted-foreground" aria-live="polite">
          <Clock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {inicio ? (
            <span className="text-evergreen">
              {relativeDay(inicio)} · {formatRange(inicio)}
            </span>
          ) : (
            'Elige el día y la hora'
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!fechaHora || !me.data} loading={pending}>
            Agendar visita
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

function ScheduleError({ error, onRetry, onUseLead, pending }) {
  const existing = error.existing
  return (
    <Alert variant={error.duplicate ? 'warning' : 'error'} className="mt-6">
      <p>{error.text}</p>
      {error.duplicate && existing?.programada && (
        <p>
          Tienes una visita programada {relativeDay(parseLocal(existing.programada.fechaHora)).toLowerCase()} a las{' '}
          {existing.programada.fechaHora.slice(11, 16)}.
        </p>
      )}
      {(error.duplicate || error.retryable) && (
        <div className="flex flex-wrap gap-2">
          {error.retryable && (
            <Button variant="outline" size="sm" onClick={onRetry} loading={pending}>
              {!pending && <RotateCw strokeWidth={1.75} aria-hidden="true" />}
              Reintentar
            </Button>
          )}
          {error.duplicate && existing && !existing.programada && (
            <Button size="sm" onClick={() => onUseLead(existing.leadId)}>
              Agendar otra visita sobre tu solicitud
            </Button>
          )}
          {error.duplicate && (
            <Link to="/panel/visitas" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ver mis visitas
            </Link>
          )}
        </div>
      )}
    </Alert>
  )
}

/**
 * Tras LEAD_DUPLICADO: busca en las visitas del cliente el lead de esta propiedad. No hay un endpoint de
 * "mis leads" para el cliente, así que se deduce de `mis-visitas` (último año y los días agendables).
 */
async function findExistingLead(propiedadId) {
  try {
    const today = startOfDay(nowInBogota())
    const list = await listMisVisitas({
      desde: toLocalDateTime(subDays(today, 365)),
      hasta: toLocalDateTime(endOfDay(addDays(today, DIAS_AGENDABLES))),
    })
    const own = (list ?? []).filter((v) => v.propiedadId === propiedadId)
    if (!own.length) return null
    const latest = own.at(-1)
    return { leadId: latest.leadId, programada: own.find((v) => v.leadId === latest.leadId && v.estadoVisita === 'PROGRAMADA') ?? null }
  } catch {
    return null
  }
}

/**
 * Confirmación (201): fecha, hora y agente asignado. `LeadResponse` solo trae `agenteId`; el nombre sale de la
 * visita recién creada en `mis-visitas` (que lo resuelve). Repite el verbo del botón (CLAUDE.md §6).
 */
function Scheduled({ lead, fallbackInicio, titulo, onClose }) {
  const inicio = parseLocal(lead?.fechaHoraVisita) ?? fallbackInicio
  const visita = useAsync(
    async (signal) => {
      if (!lead?.visitaId || !inicio) return null
      const list = await listMisVisitas({ signal, desde: toLocalDateTime(startOfDay(inicio)), hasta: toLocalDateTime(endOfDay(inicio)) })
      return (list ?? []).find((v) => v.id === lead.visitaId) ?? null
    },
    [lead?.visitaId],
  )
  const agenteId = lead?.agenteId ?? visita.data?.agenteId

  return (
    <div className="flex flex-col items-start gap-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CalendarCheck className="size-6 animate-pop" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <DialogHeader>
        <DialogTitle>Visita agendada</DialogTitle>
        <DialogDescription className="max-w-[55ch]">{titulo}. Puedes consultarla o cancelarla desde Mis visitas.</DialogDescription>
      </DialogHeader>

      <dl className="grid w-full overflow-hidden rounded-card border border-ash-grey/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bg-pale-oak/25 px-5 py-4">
          <dt className="text-small text-muted-foreground">{relativeDay(inicio)}</dt>
          <dd className="mt-1 font-display text-section font-semibold leading-none text-evergreen tabular-nums">{formatRange(inicio)}</dd>
        </div>
        <div className="flex items-center gap-3 border-t border-ash-grey/50 px-5 py-4 sm:border-l sm:border-t-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ash-grey/70 text-evergreen">
            <UserRound className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-small text-muted-foreground">Agente asignado</dt>
            <dd className="mt-0.5">
              {visita.loading ? (
                <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
              ) : agenteId ? (
                <Link
                  to={`/agentes/usuario/${agenteId}`}
                  className={cn('truncate font-medium text-evergreen underline-offset-4 hover:underline')}
                >
                  {agentName(visita.data)}
                </Link>
              ) : (
                <span className="font-medium text-evergreen">{agentName(visita.data)}</span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <DialogFooter className="mt-0 w-full">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Link to="/panel/visitas" className={buttonVariants()}>
          Ver mis visitas
        </Link>
      </DialogFooter>
    </div>
  )
}
