/**
 * Vocabulario, fechas y franjas de visitas y leads (docs/visitas-service.md §Reglas y docs/lead-service.md).
 *
 * El backend trabaja con `LocalDateTime` sin zona en hora de Colombia ("2026-10-20T10:00:00"). Aquí esas
 * cadenas se tratan como "hora de pared": `parseISO` las lee con los mismos dígitos y `toLocalDateTime`
 * las vuelve a escribir igual, sin conversiones de zona horaria del navegador.
 */
import { addDays, addMinutes, format, isSameDay, parseISO, setHours, setMinutes, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

export const ZONA = 'America/Bogota'
export const HORA_APERTURA = 8
export const HORA_CIERRE = 18
export const DURACION_MIN = 60
/** Separación entre franjas que se ofrecen al cliente. */
export const PASO_MIN = 30
/** Hasta cuántos días hacia adelante se puede agendar desde el catálogo. */
export const DIAS_AGENDABLES = 60

/* ------------------------------------------------------------------ */
/* Etiquetas (modo oración, CLAUDE.md §3)                             */
/* ------------------------------------------------------------------ */

export const ESTADO_LEAD_LABELS = {
  CONTACTADO: 'Contactado',
  VISITA_AGENDADA: 'Visita agendada',
  OFERTA_PRESENTADA: 'Oferta presentada',
  NEGOCIACION: 'En negociación',
  OFERTA_ACEPTADA: 'Oferta aceptada',
  CERRADO: 'Cerrado',
  DESCARTADO: 'Descartado',
}
export const ESTADO_LEAD_BADGE = {
  CONTACTADO: 'outline',
  VISITA_AGENDADA: 'neutral',
  OFERTA_PRESENTADA: 'warning',
  NEGOCIACION: 'warning',
  OFERTA_ACEPTADA: 'success',
  CERRADO: 'success',
  DESCARTADO: 'error',
}

export const ESTADO_VISITA_LABELS = { PROGRAMADA: 'Programada', REALIZADA: 'Realizada', CANCELADA: 'Cancelada' }
export const ESTADO_VISITA_BADGE = { PROGRAMADA: 'neutral', REALIZADA: 'success', CANCELADA: 'outline' }

/* ------------------------------------------------------------------ */
/* Fechas                                                             */
/* ------------------------------------------------------------------ */

const bogotaParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Hora actual de Colombia como "hora de pared", comparable con las fechas del backend. */
export function nowInBogota() {
  const p = Object.fromEntries(bogotaParts.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
}

/** Date → "2026-10-20T10:00:00" (formato que esperan Lead y Visitas). */
export function toLocalDateTime(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

/** Date → "2026-10-20" (parámetro `fecha` de la ocupación). */
export function toLocalDate(date) {
  return format(date, 'yyyy-MM-dd')
}

/** "2026-10-20T10:00:00" → Date con los mismos dígitos. Devuelve null si no es válida. */
export function parseLocal(iso) {
  if (!iso) return null
  const d = parseISO(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "lunes, 20 de octubre" */
export function formatDay(date) {
  return date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : '—'
}

/** "20 oct 2026" */
export function formatShortDay(date) {
  return date ? format(date, 'd MMM yyyy', { locale: es }) : '—'
}

/** "10:00" */
export function formatHour(date) {
  return date ? format(date, 'HH:mm') : '—'
}

/** "10:00 – 11:00" */
export function formatRange(inicio, fin) {
  return `${formatHour(inicio)} – ${formatHour(fin ?? (inicio && addMinutes(inicio, DURACION_MIN)))}`
}

/** "Hoy", "Mañana" o el día completo. */
export function relativeDay(date, now = nowInBogota()) {
  if (!date) return '—'
  if (isSameDay(date, now)) return 'Hoy'
  if (isSameDay(date, addDays(now, 1))) return 'Mañana'
  const label = formatDay(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/* ------------------------------------------------------------------ */
/* Franjas para agendar                                               */
/* ------------------------------------------------------------------ */

/** Primer y último día que se pueden elegir en el calendario. */
export function agendableRange(now = nowInBogota()) {
  const today = startOfDay(now)
  return { from: today, to: addDays(today, DIAS_AGENDABLES) }
}

/**
 * Franjas de inicio del día: de 08:00 hasta la última que termina a las 18:00, cada `PASO_MIN`.
 * Cada franja dura `DURACION_MIN` y queda deshabilitada si ya pasó o si se cruza con una ocupación
 * (las ocupaciones son intervalos [fechaHora, fechaHoraFin) en hora de Colombia).
 */
export function buildSlots(day, ocupacion = [], now = nowInBogota()) {
  const busy = ocupacion
    .map((o) => [parseLocal(o.fechaHora), parseLocal(o.fechaHoraFin)])
    .filter(([a, b]) => a && b)
  const slots = []
  const cierre = setMinutes(setHours(startOfDay(day), HORA_CIERRE), 0)
  for (let start = setHours(startOfDay(day), HORA_APERTURA); addMinutes(start, DURACION_MIN) <= cierre; start = addMinutes(start, PASO_MIN)) {
    const end = addMinutes(start, DURACION_MIN)
    const past = start <= now
    const taken = busy.some(([a, b]) => start < b && a < end)
    slots.push({ start, end, value: toLocalDateTime(start), disabled: past || taken, reason: past ? 'past' : taken ? 'taken' : null })
  }
  return slots
}

/** Mañana / tarde, para agrupar las franjas en el selector. */
export function splitByPeriod(slots) {
  return [
    { id: 'manana', label: 'Mañana', slots: slots.filter((s) => s.start.getHours() < 12) },
    { id: 'tarde', label: 'Tarde', slots: slots.filter((s) => s.start.getHours() >= 12) },
  ].filter((g) => g.slots.length)
}

/* ------------------------------------------------------------------ */
/* Errores de agendamiento                                            */
/* ------------------------------------------------------------------ */

/**
 * Mensaje para el cliente según el `codigo` del backend (docs/lead-service.md §Errores).
 * `retrySlot`: la franja dejó de estar libre, hay que recargar la ocupación y elegir otra.
 */
export function scheduleErrorInfo(err) {
  switch (err?.codigo) {
    case 'LEAD_DUPLICADO':
      return { text: 'Ya tienes una solicitud activa para esta propiedad. Puedes verla en Mis visitas.', duplicate: true }
    case 'VISITA_YA_EXISTE':
      return { text: 'Ya tienes una visita programada para esta solicitud. Cancélala antes de agendar otra.' }
    case 'SIN_AGENTES_DISPONIBLES':
      return { text: 'No hay agentes libres a esa hora. Elige otra franja u otro día.', retrySlot: true }
    case 'AGENTE_OCUPADO':
    case 'PROPIEDAD_OCUPADA':
      return { text: 'Esa franja se acaba de ocupar. Elige otra.', retrySlot: true }
    case 'FECHA_VISITA_INVALIDA':
    case 'FECHA_INVALIDA':
    case 'FUERA_DE_HORARIO':
      return { text: 'La hora elegida ya pasó o está fuera del horario de visitas (08:00 a 18:00).', retrySlot: true }
    case 'PROPIEDAD_NO_ENCONTRADA':
      return { text: 'Esta propiedad ya no está disponible para visitas.' }
    case 'VISITAS_NO_DISPONIBLE':
      return { text: 'La agenda de visitas no responde en este momento. Intenta de nuevo en unos minutos.' }
    default:
      return { text: err?.mensaje }
  }
}
