import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/calendar.css'
import './agenda.css'
import { createViewDay, createViewWeek } from '@schedule-x/calendar'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ESTADO_VISITA_LABELS, HORA_CIERRE, HORA_PRIMERA, ZONA, hasStarted } from '@/lib/visit'

const pad = (n) => String(n).padStart(2, '0')

/** "2026-10-20T10:00:00" (hora de pared de Colombia) → ZonedDateTime en Bogotá, con los mismos dígitos. */
function toZoned(iso) {
  return Temporal.PlainDateTime.from(iso).toZonedDateTime(ZONA)
}

/** PlainDate/ZonedDateTime → Date local con el mismo día (para date-fns). */
function toDay(t) {
  return new Date(t.year, t.month - 1, t.day)
}

/** Fuera del componente: Schedule-X vuelve a montar el calendario si cambia la referencia. */
const CUSTOM_COMPONENTS = { timeGridEvent: AgendaEvent }

/**
 * Calendario semanal de visitas (Schedule-X, re-temado en agenda.css). Cada visita es un bloque de una hora
 * coloreado por estado. No pide datos: avisa el rango visible con `onRangeChange({ from, to })` y pinta las
 * `visitas` que recibe. `onSelect(visita)` al abrir un bloque.
 */
export function AgendaCalendar({ visitas, propiedades, onRangeChange, onSelect, className }) {
  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewDay()],
    defaultView: 'week',
    locale: 'es-ES',
    firstDayOfWeek: 1,
    timezone: ZONA,
    selectedDate: Temporal.Now.plainDateISO(ZONA),
    dayBoundaries: { start: `${pad(HORA_PRIMERA)}:00`, end: `${pad(HORA_CIERRE)}:00` },
    weekOptions: { gridHeight: 640, eventOverlap: false, gridStep: 60, timeAxisFormatOptions: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } },
    callbacks: {
      onRangeUpdate: (range) => onRangeChange?.({ from: toDay(range.start), to: toDay(range.end) }),
      onEventClick: (event) => onSelect?.(event.visita),
    },
  })

  useEffect(() => {
    if (!calendar) return
    calendar.events.set(
      visitas
        .filter((v) => v.fechaHora && v.fechaHoraFin)
        .map((v) => ({
          id: v.id,
          start: toZoned(v.fechaHora),
          end: toZoned(v.fechaHoraFin),
          title: propiedades[v.propiedadId]?.titulo ?? 'Visita',
          visita: v,
        })),
    )
  }, [calendar, visitas, propiedades])

  return (
    <div className={cn('rh-agenda', className)}>
      <ScheduleXCalendar calendarApp={calendar} customComponents={CUSTOM_COMPONENTS} />
    </div>
  )
}

/** Tratamiento por estado: programada sólida en evergreen, realizada en verde de éxito, cancelada solo contorno. */
const TONE = {
  PROGRAMADA: 'bg-evergreen text-floral-white hover:bg-emerald-depths',
  REALIZADA: 'border border-success/30 bg-[color-mix(in_srgb,var(--success)_12%,var(--floral-white))] text-success hover:border-success/60',
  CANCELADA: 'border border-dashed border-ash-grey bg-floral-white text-muted-foreground hover:border-muted-foreground',
}

function AgendaEvent({ calendarEvent }) {
  const v = calendarEvent.visita
  const estado = v?.estadoVisita
  const pendiente = estado === 'PROGRAMADA' && hasStarted(v)
  return (
    <div
      className={cn(
        'relative mx-px flex h-[calc(100%-2px)] flex-col gap-0.5 overflow-hidden rounded-control px-2.5 py-1.5 text-left transition-colors duration-150',
        TONE[estado] ?? TONE.PROGRAMADA,
      )}
      title={`${calendarEvent.title} · ${ESTADO_VISITA_LABELS[estado] ?? ''}`}
    >
      <span className="flex items-center gap-1.5 text-meta tabular-nums leading-tight opacity-80">
        {v?.fechaHora?.slice(11, 16)} – {v?.fechaHoraFin?.slice(11, 16)}
        {pendiente && <span className="size-1.5 shrink-0 rounded-full bg-pale-oak" aria-label="Pendiente por marcar" />}
      </span>
      <span className={cn('line-clamp-2 text-meta font-medium leading-snug', estado === 'CANCELADA' && 'line-through')}>
        {calendarEvent.title}
      </span>
    </div>
  )
}
