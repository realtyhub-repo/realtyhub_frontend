/**
 * Lead service — generado a partir de docs/openapi/lead-service.json + docs/lead-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`) bajo `/leads/**`. Nunca se envían `X-User-Id` / `X-User-Role`:
 *   el Gateway los pone a partir del token.
 * - Todas las rutas son privadas: `apiRequest` (Authorization + reintento tras refresh ante 401).
 * - Fechas `LocalDateTime` sin zona, en hora de Colombia ("2026-10-20T10:00:00"); ver `lib/visit.js`.
 * Errores: `ApiError` { codigo, mensaje, status } (códigos en docs §Errores).
 */
import { apiRequest } from './client'

/**
 * Estados del embudo. `OFERTA_ACEPTADA` no aparece en el JSON pero sí en las notas (docs §Modelo): al entrar
 * a ese estado se publica `lead.oferta_aceptada` y Contratos genera el borrador.
 */
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
 * 409: LEAD_DUPLICADO, SIN_AGENTES_DISPONIBLES, AGENTE_OCUPADO, PROPIEDAD_OCUPADA. 400: FECHA_VISITA_INVALIDA.
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

/** GET /leads/mis-leads?estado= → LeadResponse[]. Leads asignados al agente autenticado. */
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
