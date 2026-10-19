/**
 * Comisiones service — generado a partir de docs/openapi/comisiones-service.json + docs/comisiones-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`) bajo `/comisiones/**`. Nunca se envían `X-User-Id` / `X-User-Role`.
 * - Las comisiones no se crean desde el frontend: el backend las calcula (PENDIENTE) cuando se firma un contrato.
 * - `CLIENTE` recibe 403 en todas las rutas. El AGENTE solo recibe su línea del reparto.
 * - Montos en pesos enteros; fechas `LocalDateTime` sin zona (hora de Colombia); filtros y vigencias `AAAA-MM-DD`.
 * Errores: `ApiError` { codigo, mensaje, status } (códigos en docs §Mensajes de error).
 */
import { apiRequest } from './client'

export const ESTADOS_COMISION = ['PENDIENTE', 'APROBADA', 'PAGADA', 'ANULADA', 'REVERTIDA']
export const TAMANIO_PAGINA = 20

const enc = encodeURIComponent

function query(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/**
 * GET /comisiones?estado=&desde=&hasta=&pagina=&tamanio= → { contenido: ComisionResponse[], pagina, tamanio,
 * totalElementos, totalPaginas }, del más reciente al más antiguo por `firmadoEn`. `pagina` desde 0; `tamanio` ≤ 100.
 * Agente: las suyas; gerente: las de su oficina; admin: todas.
 */
export function listComisiones({ estado, desde, hasta, pagina = 0, tamanio = TAMANIO_PAGINA, signal } = {}) {
  return apiRequest(`/comisiones${query({ estado, desde, hasta, pagina, tamanio })}`, { signal })
}

/**
 * GET /comisiones/resumen?desde=&hasta= → { desde, hasta, perspectiva, porEstado: [{ estado, cantidad, monto }] }.
 * Siempre trae los cinco estados. Sin fechas: del 1 de enero del año actual a hoy.
 * `perspectiva`: PARTICIPACION_AGENTE | PARTICIPACION_OFICINA | MONTO_TOTAL (qué suma `monto`).
 */
export function getResumen({ desde, hasta, signal } = {}) {
  return apiRequest(`/comisiones/resumen${query({ desde, hasta })}`, { signal })
}

/**
 * GET /comisiones/{id} → ComisionDetalleResponse: la comisión más { centralId, baseCalculo, valorRegla, acuerdoId,
 * aprobadaPor, pagadaPor, historial: [{ estadoAnterior, estadoNuevo, usuarioId, motivo, createdAt }] }.
 */
export function getComision(id, { signal } = {}) {
  return apiRequest(`/comisiones/${enc(id)}`, { signal })
}

/** PATCH /comisiones/{id}/aprobar → 200 ComisionResponse. Sin body. Gerente de la oficina o admin; nunca la propia. */
export function aprobarComision(id) {
  return apiRequest(`/comisiones/${enc(id)}/aprobar`, { method: 'PATCH' })
}

/** PATCH /comisiones/{id}/pagar → 200 ComisionResponse. Body { referenciaPago* } (≤ 120). Solo admin, desde APROBADA. */
export function pagarComision(id, referenciaPago) {
  return apiRequest(`/comisiones/${enc(id)}/pagar`, { method: 'PATCH', body: { referenciaPago } })
}

/** PATCH /comisiones/{id}/revertir → 200 ComisionResponse. Body { motivo* } (≤ 500). Solo admin, desde PAGADA. */
export function revertirComision(id, motivo) {
  return apiRequest(`/comisiones/${enc(id)}/revertir`, { method: 'PATCH', body: { motivo } })
}

/* ------------------------------------------------------------------ */
/* Acuerdos comerciales                                               */
/* ------------------------------------------------------------------ */

/**
 * GET /comisiones/acuerdos → AcuerdoResponse[] del más reciente al más antiguo
 * { id, nombre, vigenteDesde, vigenteHasta, creadoPor, createdAt, reglas[] }. Gerente (lectura) y admin.
 */
export function listAcuerdos({ signal } = {}) {
  return apiRequest('/comisiones/acuerdos', { signal })
}

/**
 * GET /comisiones/acuerdos/{id} → AcuerdoResponse con reglas
 * [{ id, tipoContrato, baseCalculo, valor, porcentajeAgente, porcentajeOficina, porcentajeCentral }].
 */
export function getAcuerdo(id, { signal } = {}) {
  return apiRequest(`/comisiones/acuerdos/${enc(id)}`, { signal })
}

/**
 * POST /comisiones/acuerdos → 201 AcuerdoResponse. Body { nombre*, vigenteDesde*, vigenteHasta?, reglas*[] }.
 * Solo admin. 400 ACUERDO_INVALIDO (el `mensaje` dice qué regla falla), 409 ACUERDO_SOLAPADO.
 */
export function crearAcuerdo(data) {
  return apiRequest('/comisiones/acuerdos', { method: 'POST', body: data })
}

/** PATCH /comisiones/acuerdos/{id}/cerrar → 200 AcuerdoResponse. Body { vigenteHasta* }: solo puede acortar la vigencia. */
export function cerrarAcuerdo(id, vigenteHasta) {
  return apiRequest(`/comisiones/acuerdos/${enc(id)}/cerrar`, { method: 'PATCH', body: { vigenteHasta } })
}
