/**
 * Analytics service (docs/analitica-service.md). Todo pasa por el Gateway (`API_BASE_URL`).
 *
 * - Pública: `GET /analitica/propiedades/mas-vistas`.
 * - Con sesión: las métricas de leads. El alcance depende del rol (admin: todo, gerente: su oficina,
 *   agente: lo suyo, cliente: 403). Nunca se envían `X-User-Id` / `X-User-Role`.
 * Errores: `ApiError` { mensaje, status }.
 */
import { apiRequest, request } from './client'

function query(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    qs.append(k, v)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/**
 * GET /analitica/propiedades/mas-vistas → [{ propiedadId, vistas }] ordenado de mayor a menor.
 * `dias` (1-365, por defecto 30) y `limite` (1-50, por defecto 10) se acotan en el servidor.
 * Solo trae ids y conteos: las tarjetas se resuelven con `getPropiedadesPorIds`.
 */
export function getPropiedadesMasVistas({ dias = 30, limite = 10, signal } = {}) {
  return request(`/analitica/propiedades/mas-vistas${query({ dias, limite })}`, { method: 'GET', signal })
}

/**
 * GET /analitica/leads/conversion-por-agente → [{ agenteId, nombre, totalLeads, cerrados, descartados, activos,
 * tasaConversion }]. `agenteId` es el id del USUARIO. `desde` / `hasta`: yyyy-MM-dd sobre la fecha de creación.
 */
export function getConversionPorAgente({ desde, hasta, signal } = {}) {
  return apiRequest(`/analitica/leads/conversion-por-agente${query({ desde, hasta })}`, { signal })
}

/** GET /analitica/leads/tiempo-promedio-cierre → { leadsCerrados, promedioHoras, porAgente: [{ agenteId, nombre, leadsCerrados, promedioHoras }] }. */
export function getTiempoPromedioCierre({ desde, hasta, signal } = {}) {
  return apiRequest(`/analitica/leads/tiempo-promedio-cierre${query({ desde, hasta })}`, { signal })
}

/** GET /analitica/leads/por-canal → [{ canalOrigen, totalLeads, cerrados, tasaConversion }]. */
export function getLeadsPorCanal({ desde, hasta, signal } = {}) {
  return apiRequest(`/analitica/leads/por-canal${query({ desde, hasta })}`, { signal })
}
