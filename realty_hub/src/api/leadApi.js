/**
 * Lead service — generado a partir de docs/openapi/leads-service.json + docs/leads-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`) bajo `/leads/**`. Nunca se envían `X-User-Id` / `X-User-Role`:
 *   el Gateway los pone a partir del token.
 * - Todas las rutas son privadas: `apiRequest` (Authorization + reintento tras refresh ante 401).
 * - Fechas `LocalDateTime` sin zona, en hora de Colombia ("2026-10-20T10:00:00"); ver `lib/visit.js`.
 * Errores: `ApiError` { codigo, mensaje, status } (códigos en docs §Mensajes de error).
 */
import { apiRequest } from './client'

/** Estados del pipeline, en orden. Al entrar a `OFERTA_ACEPTADA` el backend genera el borrador del contrato. */
export const ESTADOS_LEAD = [
  'CONTACTADO',
  'VISITA_AGENDADA',
  'OFERTA_PRESENTADA',
  'NEGOCIACION',
  'OFERTA_ACEPTADA',
  'CERRADO',
  'DESCARTADO',
]

/** Estados que ya no se pueden modificar (409 ESTADO_TERMINAL). */
export const ESTADOS_LEAD_TERMINALES = ['CERRADO', 'DESCARTADO']

const enc = encodeURIComponent

/**
 * POST /leads → 201 LeadResponse { id, propiedadId, clienteId, estado, agenteId, visitaId, fechaHoraVisita }.
 * Solo CLIENTE. Body { propiedadId*, fechaHora* }: el backend escoge un agente libre a esa hora y reserva la visita.
 * 409: LEAD_DUPLICADO, SIN_AGENTES_DISPONIBLES, AGENTE_OCUPADO, PROPIEDAD_OCUPADA, VISITA_YA_EXISTE.
 * 400: FECHA_VISITA_INVALIDA. 404: PROPIEDAD_NO_ENCONTRADA. 503: VISITAS_NO_DISPONIBLE.
 */
export function crearLead(propiedadId, fechaHora) {
  return apiRequest('/leads', { method: 'POST', body: { propiedadId, fechaHora } })
}

/**
 * POST /leads/{id}/visitas → 201 LeadResponse. Solo el CLIENTE dueño del lead; reutiliza el agente asignado.
 * 409 VISITA_YA_EXISTE si el lead ya tiene una visita PROGRAMADA.
 */
export function agendarOtraVisita(leadId, fechaHora) {
  return apiRequest(`/leads/${enc(leadId)}/visitas`, { method: 'POST', body: { fechaHora } })
}

/**
 * GET /leads/mis-leads?estado= → LeadResponse[]. Leads asignados al agente autenticado.
 * No trae los datos del cliente (solo el detalle); `fechaHoraVisita` puede venir null.
 */
export function listMisLeads({ estado, signal } = {}) {
  const qs = estado ? `?estado=${enc(estado)}` : ''
  return apiRequest(`/leads/mis-leads${qs}`, { signal })
}

/**
 * GET /leads/{id} → LeadDetalleResponse { id, propiedadId, estado, clienteId, nombreCliente, telefonoCliente,
 * emailCliente, agenteId, createdAt }. Agente dueño o administrador.
 */
export function getLead(id, { signal } = {}) {
  return apiRequest(`/leads/${enc(id)}`, { signal })
}

/** PUT /leads/{id}/estado → 204. Body { nuevoEstado }. 409 ESTADO_TERMINAL si está CERRADO o DESCARTADO. */
export function cambiarEstadoLead(id, nuevoEstado) {
  return apiRequest(`/leads/${enc(id)}/estado`, { method: 'PUT', body: { nuevoEstado } })
}
