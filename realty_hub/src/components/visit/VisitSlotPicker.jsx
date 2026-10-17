import { CalendarX, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getOcupacion } from '@/api/visitaApi'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import {
  agendableRange,
  buildSlots,
  firstBookableDay,
  formatHour,
  nowInBogota,
  parseLocal,
  relativeDay,
  splitByPeriod,
  toLocalDate,
  visitaErrorMessage,
} from '@/lib/visit'

/**
 * Selector de fecha y hora de una visita (docs/visits-service.md §1). Se usa al crear un lead y al agendar
 * otra visita sobre uno existente.
 *
 * - Entrada: `propiedadId`. Pide `GET /visitas/propiedad/{id}/ocupacion?fecha=` por cada día elegido.
 * - Salida: `onChange(fechaHora | null)` con `AAAA-MM-DDTHH:mm:00`; `value` es la hora elegida.
 * - `refreshKey`: al cambiar, vuelve a pedir la ocupación (p. ej. tras AGENTE_OCUPADO o PROPIEDAD_OCUPADA).
 *
 * Que una hora salga libre aquí no garantiza un agente libre: eso lo valida el backend al crear el lead.
 */
export function VisitSlotPicker({ propiedadId, value, onChange, refreshKey = 0, disabled = false }) {
  const [now] = useState(nowInBogota)
  const range = agendableRange(now)
  const [day, setDay] = useState(() => (value ? parseLocal(value) : firstBookableDay(now)))

  const ocupacion = useAsync(
    (signal) => getOcupacion(propiedadId, toLocalDate(day), { signal }),
    [propiedadId, toLocalDate(day), refreshKey],
  )
  const slots = buildSlots(day, ocupacion.data ?? [], nowInBogota())
  const free = slots.filter((s) => !s.disabled).length
  const selected = slots.find((s) => s.value === value) ?? null

  // Si al refrescar la ocupación la hora elegida quedó tomada, se suelta para que el cliente elija otra.
  const selectedTaken = !!selected?.disabled
  useEffect(() => {
    if (selectedTaken) onChange(null)
  }, [selectedTaken, onChange])

  function pickDay(d) {
    if (!d) return
    setDay(d)
    onChange(null)
  }

  return (
    <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
      <Calendar
        mode="single"
        required
        selected={day}
        onSelect={pickDay}
        defaultMonth={day}
        startMonth={range.from}
        endMonth={range.to}
        disabled={disabled ? true : [{ before: range.from }, { after: range.to }]}
        className="mx-auto md:mx-0"
      />

      <section aria-labelledby="horas-title" className="min-w-0 md:border-l md:border-ash-grey/50 md:pl-8">
        <div className="flex items-baseline justify-between gap-4">
          <h3 id="horas-title" className="font-display text-body font-semibold text-evergreen">
            {relativeDay(day, now)}
          </h3>
          {!ocupacion.loading && !ocupacion.error && (
            <p className="text-meta text-muted-foreground tabular-nums">
              {free} {free === 1 ? 'hora libre' : 'horas libres'}
            </p>
          )}
        </div>

        {ocupacion.error ? (
          <Alert variant="error" className="mt-4">
            <p>{visitaErrorMessage(ocupacion.error)}</p>
            <Button variant="outline" size="sm" onClick={ocupacion.reload}>
              <RotateCw strokeWidth={1.75} aria-hidden="true" />
              Reintentar
            </Button>
          </Alert>
        ) : ocupacion.loading && !ocupacion.data ? (
          <SlotsSkeleton />
        ) : free === 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-control border border-dashed border-ash-grey px-4 py-5 text-small text-muted-foreground">
            <CalendarX className="mt-px size-[18px] shrink-0 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
            No quedan horas libres este día. Elige otro en el calendario.
          </div>
        ) : (
          <div
            className={cn('mt-4 space-y-5 transition-opacity duration-150', ocupacion.loading && 'opacity-60')}
            role="radiogroup"
            aria-labelledby="horas-title"
          >
            {splitByPeriod(slots).map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-meta font-medium text-muted-foreground">{group.label}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {group.slots.map((s) => {
                    const active = selected?.value === s.value && !s.disabled
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled || s.disabled}
                        title={s.reason === 'taken' ? 'Hora ocupada' : s.reason === 'past' ? 'Esta hora ya pasó' : undefined}
                        onClick={() => onChange(s.value)}
                        className={cn(
                          'group flex h-14 flex-col items-center justify-center rounded-control border tabular-nums transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'border-evergreen bg-evergreen text-floral-white'
                            : 'border-ash-grey/80 text-evergreen hover:border-evergreen hover:bg-pale-oak/20',
                          s.disabled && 'cursor-not-allowed border-ash-grey/35 text-ash-grey hover:border-ash-grey/35 hover:bg-transparent',
                        )}
                      >
                        <span className={cn('text-small font-medium leading-none', s.reason === 'taken' && 'line-through decoration-ash-grey')}>
                          {formatHour(s.start)}
                        </span>
                        <span className={cn('mt-1 text-meta leading-none', active ? 'text-floral-white/70' : 'text-muted-foreground', s.disabled && 'text-ash-grey')}>
                          {s.reason === 'taken' ? 'Ocupada' : `a ${formatHour(s.end)}`}
                        </span>
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
  )
}

function SlotsSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="status" aria-label="Cargando horas">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="h-14 animate-pulse rounded-control bg-pale-oak/30" />
      ))}
    </div>
  )
}
