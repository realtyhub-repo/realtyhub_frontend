import { CalendarCheck, CalendarX, Clock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { agendarOtraVisita, crearLead } from '@/api/leadApi'
import { getOcupacion } from '@/api/visitaApi'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import {
  agendableRange,
  buildSlots,
  formatHour,
  formatRange,
  nowInBogota,
  parseLocal,
  relativeDay,
  scheduleErrorInfo,
  splitByPeriod,
  toLocalDate,
} from '@/lib/visit'

/**
 * Agendar una visita eligiendo día y franja.
 * - Sin `leadId`: crea el lead (`POST /leads`) y el backend asigna un agente libre a esa hora.
 * - Con `leadId`: agenda otra visita sobre un lead existente (`POST /leads/{id}/visitas`).
 * Las franjas ocupadas salen de `GET /visitas/propiedad/{id}/ocupacion` (docs/visitas-service.md).
 */
export function ScheduleVisitDialog({ open, onOpenChange, propiedad, leadId, onScheduled }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-32px)] max-w-3xl overflow-y-auto">
        <ScheduleForm propiedad={propiedad} leadId={leadId} onScheduled={onScheduled} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** Montado solo mientras el diálogo está abierto: cada apertura arranca limpia. */
function ScheduleForm({ propiedad, leadId, onScheduled, onClose }) {
  const [now] = useState(nowInBogota)
  const range = agendableRange(now)
  const [day, setDay] = useState(() => firstDayWithSlots(now))
  const [slot, setSlot] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const ocupacion = useAsync((signal) => getOcupacion(propiedad.id, toLocalDate(day), { signal }), [propiedad.id, day.getTime()])
  const slots = buildSlots(day, ocupacion.data ?? [], nowInBogota())
  const free = slots.filter((s) => !s.disabled).length
  const selected = slots.find((s) => s.value === slot && !s.disabled) ?? null

  function pickDay(d) {
    if (!d) return
    setDay(d)
    setSlot(null)
    setError(null)
  }

  async function submit() {
    if (!selected) return
    setPending(true)
    setError(null)
    try {
      const lead = leadId ? await agendarOtraVisita(leadId, selected.value) : await crearLead(propiedad.id, selected.value)
      setDone({ inicio: parseLocal(lead?.fechaHoraVisita) ?? selected.start })
      onScheduled?.(lead)
    } catch (err) {
      const info = scheduleErrorInfo(err)
      setError(info)
      if (info.retrySlot) {
        setSlot(null)
        ocupacion.reload()
      }
    } finally {
      setPending(false)
    }
  }

  if (done) return <Scheduled inicio={done.inicio} titulo={propiedad.titulo} onClose={onClose} />

  return (
    <>
      <DialogHeader>
        <DialogTitle>{leadId ? 'Agendar otra visita' : 'Agendar visita'}</DialogTitle>
        <DialogDescription className="max-w-[60ch]">
          {propiedad.titulo}. Las visitas duran una hora, entre 08:00 y 18:00 (hora de Colombia).
          {!leadId && ' Te asignamos un agente libre a la hora que elijas.'}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 grid gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <Calendar
          mode="single"
          required
          selected={day}
          onSelect={pickDay}
          defaultMonth={day}
          startMonth={range.from}
          endMonth={range.to}
          disabled={[{ before: range.from }, { after: range.to }]}
          className="mx-auto md:mx-0"
        />

        <section aria-labelledby="franjas-title" className="min-w-0 md:border-l md:border-ash-grey/50 md:pl-8">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="franjas-title" className="font-display text-body font-semibold text-evergreen">
              {relativeDay(day, now)}
            </h3>
            {!ocupacion.loading && !ocupacion.error && (
              <p className="text-meta text-muted-foreground tabular-nums">
                {free} {free === 1 ? 'franja libre' : 'franjas libres'}
              </p>
            )}
          </div>

          {ocupacion.error ? (
            <Alert variant="error" className="mt-4">
              <p>{ocupacion.error.mensaje}</p>
              <Button variant="outline" size="sm" onClick={ocupacion.reload}>
                Reintentar
              </Button>
            </Alert>
          ) : ocupacion.loading ? (
            <SlotsSkeleton />
          ) : free === 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-control border border-dashed border-ash-grey px-4 py-5 text-small text-muted-foreground">
              <CalendarX className="mt-px size-[18px] shrink-0 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
              No quedan franjas libres este día. Elige otro en el calendario.
            </div>
          ) : (
            <div className="mt-4 space-y-5" role="radiogroup" aria-labelledby="franjas-title">
              {splitByPeriod(slots).map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-meta font-medium text-muted-foreground">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.slots.map((s) => {
                      const active = selected?.value === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={s.disabled}
                          title={s.reason === 'taken' ? 'Franja ocupada' : s.reason === 'past' ? 'Esta hora ya pasó' : undefined}
                          onClick={() => {
                            setSlot(s.value)
                            setError(null)
                          }}
                          className={cn(
                            'h-10 rounded-control border text-small font-medium tabular-nums transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                              ? 'border-evergreen bg-evergreen text-floral-white'
                              : 'border-ash-grey/80 text-evergreen hover:border-evergreen hover:bg-pale-oak/20',
                            s.disabled && 'cursor-not-allowed border-ash-grey/40 text-ash-grey hover:border-ash-grey/40 hover:bg-transparent',
                            s.reason === 'taken' && 'line-through decoration-ash-grey',
                          )}
                        >
                          {formatHour(s.start)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {error?.text && (
        <Alert variant="error" className="mt-6">
          <p>{error.text}</p>
          {error.duplicate && (
            <Link to="/panel/visitas" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ver mis visitas
            </Link>
          )}
        </Alert>
      )}

      <DialogFooter className="items-center sm:justify-between">
        <p className="flex items-center gap-2 text-small text-muted-foreground" aria-live="polite">
          <Clock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {selected ? (
            <span className="text-evergreen">
              {relativeDay(day, now)} · {formatRange(selected.start, selected.end)}
            </span>
          ) : (
            'Elige una hora de inicio'
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!selected} loading={pending}>
            Agendar visita
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

/** Confirmación: repite el verbo del botón ("Agendar visita" → "Visita agendada", CLAUDE.md §6). */
function Scheduled({ inicio, titulo, onClose }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CalendarCheck className="size-6 animate-pop" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <DialogHeader>
        <DialogTitle>Visita agendada</DialogTitle>
        <DialogDescription className="max-w-[55ch]">
          {titulo}. Un agente de RealtyHub te espera en la propiedad; puedes consultar o cancelar la visita desde Mis visitas.
        </DialogDescription>
      </DialogHeader>
      <div className="w-full rounded-card bg-pale-oak/25 px-5 py-4">
        <p className="text-small text-muted-foreground">{relativeDay(inicio)}</p>
        <p className="mt-1 font-display text-section font-semibold leading-none text-evergreen tabular-nums">{formatRange(inicio)}</p>
      </div>
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

function SlotsSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-label="Cargando franjas">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="h-10 animate-pulse rounded-control bg-pale-oak/30" />
      ))}
    </div>
  )
}

/** Hoy si aún queda alguna franja por empezar; si no, mañana. */
function firstDayWithSlots(now) {
  const today = agendableRange(now).from
  return buildSlots(today, [], now).some((s) => !s.disabled) ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}
