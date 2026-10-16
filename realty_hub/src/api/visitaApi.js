/**
 * Visitas service — generado a partir de docs/openapi/visitas-service.json + docs/visitas-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`) bajo `/visitas/**`. Nunca se envían `X-User-Id` / `X-User-Role`.
 * - `/internal/visitas/**` no lo expone el Gateway (lo usa Lead): no hay funciones para esas rutas. Las
 *   visitas se crean siempre a través de Lead (`crearLead`, `agendarOtraVisita` en leadApi.js).
 * - Fechas `LocalDateTime` sin zona, en hora de Colombia; ver `lib/visit.js`.
 * Errores: `ApiError` { codigo, mensaje, status }.
 */
import { apiRequest } from './client'

export const ESTADOS_VISITA = ['PROGRAMADA', 'REALIZADA', 'CANCELADA']

const enc = encodeURIComponent

function query(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return qs ? `?${qs}` : ''
}

/**
 * GET /visitas/propiedad/{propiedadId}/ocupacion?fecha=YYYY-MM-DD → [{ fechaHora, fechaHoraFin }].
 * Franjas no canceladas de la propiedad ese día, para pintar el calendario.
 */
export function getOcupacion(propiedadId, fecha, { signal } = {}) {
  return apiRequest(`/visitas/propiedad/${enc(propiedadId)}/ocupacion${query({ fecha })}`, { signal })
}

/**
 * GET /visitas/mis-visitas?estado=&desde=&hasta= → VisitaResponse[]
 * { id, propiedadId, clienteId, agenteId, leadId, fechaHora, fechaHoraFin, estadoVisita }.
 * CLIENTE ve sus visitas; los demás roles, las visitas donde son el agente. Sin rango: hoy → 30 días.
 */
export function listMisVisitas({ estado, desde, hasta, signal } = {}) {
  return apiRequest(`/visitas/mis-visitas${query({ estado, desde, hasta })}`, { signal })
}

/**
 * PATCH /visitas/{id}/estado → 200 VisitaResponse. Body { nuevoEstado }.
 * Solo desde PROGRAMADA; REALIZADA únicamente si la hora de inicio ya pasó. 409 TRANSICION_INVALIDA.
 */
export function cambiarEstadoVisita(id, nuevoEstado) {
  return apiRequest(`/visitas/${enc(id)}/estado`, { method: 'PATCH', body: { nuevoEstado } })
}
