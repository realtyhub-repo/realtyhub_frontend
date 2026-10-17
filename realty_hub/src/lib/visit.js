/**
 * Vocabulario, fechas, franjas y errores de visitas y leads (docs/visits-service.md y docs/leads-service.md).
 *
 * El backend trabaja con `LocalDateTime` sin zona en hora de Colombia ("2026-10-20T10:00:00") y los docs piden
 * mostrarlas tal cual. Aquí esas cadenas se tratan como "hora de pared": `parseLocal` las lee con los mismos
 * dígitos y `toLocalDateTime` las vuelve a escribir igual, sin conversiones de zona horaria del navegador.
 */
import { addDays, addMinutes, endOfDay, format, isSameDay, parseISO, setHours, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

export const ZONA = 'America/Bogota'
/** Primera y última hora de inicio que se ofrecen: cada visita dura 60 min y termina antes de las 18:00. */
export const HORA_PRIMERA = 8
export const HORA_ULTIMA = 17
export const HORA_CIERRE = 18
export const DURACION_MIN = 60
/** Hasta cuántos días hacia adelante se puede agendar. */
export const DIAS_AGENDABLES = 60
/** Rango por defecto de "Mis visitas": desde hoy hasta 30 días (docs/visits-service.md §2). */
export const DIAS_RANGO_DEFECTO = 30

/* ------------------------------------------------------------------ */
/* Etiquetas (modo oración, CLAUDE.md §3)                             */
/* ------------------------------------------------------------------ */

export const ESTADO_LEAD_LABELS = {
  CONTACTADO: 'Contactado',
  VISITA_AGENDADA: 'Visita agendada',
  OFERTA_PRESENTADA: 'Oferta presentada',
  NEGOCIACION: 'Negociación',
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

/** Cambios de estado del lead que piden confirmación: los finales no se deshacen y OFERTA_ACEPTADA genera el contrato. */
export const CONFIRMAR_ESTADO_LEAD = {
  OFERTA_ACEPTADA: { title: 'Pasar a oferta aceptada', text: 'Esto generará el borrador del contrato para este cliente y esta propiedad.' },
  CERRADO: { title: 'Cerrar lead', text: 'El lead quedará cerrado y ya no se podrá modificar.' },
  DESCARTADO: { title: 'Descartar lead', text: 'El lead quedará descartado y ya no se podrá modificar.', destructive: true },
}

export const ESTADO_VISITA_LABELS = { PROGRAMADA: 'Programada', REALIZADA: 'Realizada', CANCELADA: 'Cancelada' }
export const ESTADO_VISITA_BADGE = { PROGRAMADA: 'neutral', REALIZADA: 'success', CANCELADA: 'outline' }

/** Nombre del agente con el respaldo que piden los docs cuando Usuarios no respondió. */
export function agentName(visita) {
  return visita?.nombreAgente || 'Agente asignado'
}

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

/** Date → "2026-10-20T10:00:00" (formato que esperan Leads y Visitas). */
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

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Lunes, 20 de octubre" */
export function formatDay(date) {
  return date ? capitalize(format(date, "EEEE, d 'de' MMMM", { locale: es })) : '—'
}

/** "20 oct 2026" */
export function formatShortDay(date) {
  return date ? format(date, 'd MMM yyyy', { locale: es }) : '—'
}

/** "20 oct" */
export function formatDayMonth(date) {
  return date ? format(date, 'd MMM', { locale: es }) : '—'
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
  return formatDay(date)
}

/** La visita ya empezó: solo entonces se puede marcar como realizada (si no, TRANSICION_INVALIDA). */
export function hasStarted(visita, now = nowInBogota()) {
  const inicio = parseLocal(visita?.fechaHora)
  return !!inicio && inicio <= now
}

/* ------------------------------------------------------------------ */
/* Rangos de consulta (`desde` / `hasta` de mis-visitas)              */
/* ------------------------------------------------------------------ */

/** Hoy → 30 días, en días completos. */
export function defaultRange(now = nowInBogota()) {
  const from = startOfDay(now)
  return { from, to: addDays(from, DIAS_RANGO_DEFECTO) }
}

/** { from, to } (días) → { desde, hasta } en `AAAA-MM-DDTHH:mm:ss`, cubriendo los días completos. */
export function rangeParams({ from, to }) {
  return { desde: toLocalDateTime(startOfDay(from)), hasta: toLocalDateTime(endOfDay(to ?? from)) }
}

/** Valida antes de enviar: la API responde FECHA_INVALIDA si `desde` es posterior a `hasta`. */
export function rangeError({ from, to }) {
  if (!from || !to) return 'Elige el día de inicio y el de fin.'
  if (startOfDay(from) > startOfDay(to)) return 'El día de inicio debe ser anterior al de fin.'
  return null
}

/* ------------------------------------------------------------------ */
/* Franjas para agendar                                               */
/* ------------------------------------------------------------------ */

/** Primer y último día que se pueden elegir en el calendario (sin fechas pasadas). */
export function agendableRange(now = nowInBogota()) {
  const today = startOfDay(now)
  return { from: today, to: addDays(today, DIAS_AGENDABLES) }
}

/**
 * Bloques de una hora de 08:00 a 17:00. Un bloque queda deshabilitado si ya empezó o si se cruza con una
 * franja ocupada [fechaHora, fechaHoraFin). `[]` de ocupación = día libre.
 * `value` es la `fechaHora` que se envía: `AAAA-MM-DDTHH:mm:00`.
 */
export function buildSlots(day, ocupacion = [], now = nowInBogota()) {
  const busy = (ocupacion ?? [])
    .map((o) => [parseLocal(o.fechaHora), parseLocal(o.fechaHoraFin)])
    .filter(([a, b]) => a && b)
  const slots = []
  for (let h = HORA_PRIMERA; h <= HORA_ULTIMA; h++) {
    const start = setHours(startOfDay(day), h)
    const end = addMinutes(start, DURACION_MIN)
    const past = start <= now
    const taken = busy.some(([a, b]) => start < b && a < end)
    slots.push({ start, end, value: toLocalDateTime(start), disabled: past || taken, reason: past ? 'past' : taken ? 'taken' : null })
  }
  return slots
}

/** Mañana / tarde, para agrupar los bloques en el selector. */
export function splitByPeriod(slots) {
  return [
    { id: 'manana', label: 'Mañana', slots: slots.filter((s) => s.start.getHours() < 12) },
    { id: 'tarde', label: 'Tarde', slots: slots.filter((s) => s.start.getHours() >= 12) },
  ].filter((g) => g.slots.length)
}

/** Hoy si aún queda algún bloque por empezar; si no, mañana. */
export function firstBookableDay(now = nowInBogota()) {
  const today = startOfDay(now)
  return buildSlots(today, [], now).some((s) => !s.disabled) ? today : addDays(today, 1)
}

/* ------------------------------------------------------------------ */
/* Errores: se decide por `codigo`, nunca por el texto de `mensaje`   */
/* ------------------------------------------------------------------ */

const SESION = 'Tu sesión expiró. Vuelve a ingresar.'

/** docs/leads-service.md §Mensajes de error */
const LEAD_ERRORS = {
  FECHA_VISITA_INVALIDA: 'Elige una fecha futura entre las 8:00 y las 17:00.',
  SIN_AGENTES_DISPONIBLES: 'No hay agentes libres a esa hora. Prueba con otra.',
  AGENTE_OCUPADO: 'Esa hora acaba de ocuparse. Elige otra.',
  PROPIEDAD_OCUPADA: 'Ya hay una visita en esa franja.',
  LEAD_DUPLICADO: 'Ya tienes una solicitud activa para esta propiedad.',
  VISITA_YA_EXISTE: 'Este lead ya tiene una visita programada.',
  PROPIEDAD_NO_ENCONTRADA: 'La propiedad ya no está disponible.',
  ESTADO_TERMINAL: 'Este lead ya está cerrado o descartado.',
  ACCESO_NO_AUTORIZADO: 'No tienes permiso para esta acción.',
  CONTEXTO_INVALIDO: SESION,
  VISITAS_NO_DISPONIBLE: 'El servicio de visitas no responde. Intenta de nuevo.',
  // Errores de Visitas que Leads puede propagar al reservar.
  FECHA_INVALIDA: 'Elige una fecha futura entre las 8:00 y las 17:00.',
  FUERA_DE_HORARIO: 'Las visitas son entre las 8:00 y las 18:00.',
}

/** docs/visits-service.md §Mensajes de error */
const VISITA_ERRORS = {
  SOLICITUD_INVALIDA: 'Revisa los datos enviados.',
  FECHA_INVALIDA: 'La fecha no es válida.',
  FUERA_DE_HORARIO: 'Las visitas son entre las 8:00 y las 18:00.',
  AGENTE_OCUPADO: 'El agente tiene otra visita en esa hora.',
  PROPIEDAD_OCUPADA: 'La propiedad ya tiene una visita en esa franja.',
  VISITA_YA_EXISTE: 'Este lead ya tiene una visita programada.',
  TRANSICION_INVALIDA: 'Esta visita ya no se puede modificar.',
  VISITA_NO_ENCONTRADA: 'La visita no existe.',
  ACCESO_NO_AUTORIZADO: 'No tienes permiso sobre esta visita.',
  CONTEXTO_INVALIDO: SESION,
}

export function leadErrorMessage(err) {
  return LEAD_ERRORS[err?.codigo] ?? err?.mensaje
}

export function visitaErrorMessage(err) {
  return VISITA_ERRORS[err?.codigo] ?? err?.mensaje
}

/** Códigos tras los que hay que volver a pedir las franjas y dejar que el cliente elija otra hora. */
const RETRY_SLOT = new Set([
  'SIN_AGENTES_DISPONIBLES',
  'AGENTE_OCUPADO',
  'PROPIEDAD_OCUPADA',
  'FECHA_VISITA_INVALIDA',
  'FECHA_INVALIDA',
  'FUERA_DE_HORARIO',
])

/**
 * Error al agendar (`POST /leads` o `POST /leads/{id}/visitas`):
 * - `retrySlot`: la hora dejó de servir; se recargan las franjas y se conserva el resto del formulario.
 * - `duplicate`: LEAD_DUPLICADO, se ofrece ir a Mis visitas o agendar sobre el lead existente.
 * - `retryable`: 503, se ofrece reintentar el mismo envío.
 */
export function scheduleErrorInfo(err) {
  return {
    text: leadErrorMessage(err),
    retrySlot: RETRY_SLOT.has(err?.codigo),
    duplicate: err?.codigo === 'LEAD_DUPLICADO',
    retryable: err?.codigo === 'VISITAS_NO_DISPONIBLE' || err?.status === 503,
  }
}
