/**
 * Contratos service — generado a partir de docs/openapi/contract-service.json + docs/contratos-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`) bajo `/contratos/**`. Nunca se envían `X-User-Id` / `X-User-Role`.
 * - Los contratos no se crean desde el frontend: el backend genera el BORRADOR cuando un lead pasa a OFERTA_ACEPTADA.
 * - `GERENTE_OFICINA` recibe 403 en todas las rutas; `ADMINISTRADOR_CENTRAL` no tiene listado propio.
 * - Fechas `LocalDateTime` sin zona, en hora de Colombia.
 * Errores: `ApiError` { codigo, mensaje, status } (códigos en docs §Mensajes de error).
 */
import { apiRequest, apiRequestPdf } from './client'

export const ESTADOS_CONTRATO = ['BORRADOR', 'FIRMADO', 'CANCELADO']

const enc = encodeURIComponent

/**
 * GET /contratos/mis-contratos?estado= → ContratoResponse[] del más reciente al más antiguo
 * { id, leadId, propiedadId, clienteId, agenteId, tipo, estado, precioAcordado, firmadoEn, createdAt }.
 * Solo CLIENTE y AGENTE (los demás roles reciben 403).
 */
export function listMisContratos({ estado, signal } = {}) {
  return apiRequest(`/contratos/mis-contratos${estado ? `?estado=${enc(estado)}` : ''}`, { signal })
}

/**
 * GET /contratos/{id} → ContratoDetalleResponse: lo anterior más { pais, contenido, nombreCliente, nombreAgente,
 * direccionPropiedad, ciudadPropiedad, updatedAt }. Cliente o agente del contrato, o administrador central.
 */
export function getContrato(id, { signal } = {}) {
  return apiRequest(`/contratos/${enc(id)}`, { signal })
}

/**
 * PUT /contratos/{id} → 200 ContratoResponse (sin `contenido`: hay que volver a pedir el detalle).
 * Body { precioAcordado* } (número > 0). Solo agente del contrato o admin y solo en BORRADOR (409 CONTRATO_NO_EDITABLE).
 */
export function actualizarPrecio(id, precioAcordado) {
  return apiRequest(`/contratos/${enc(id)}`, { method: 'PUT', body: { precioAcordado } })
}

/**
 * PATCH /contratos/{id}/firmar → 200 ContratoResponse con estado FIRMADO y `firmadoEn`. Sin body.
 * Genera y almacena el PDF (puede tardar). 409 PRECIO_REQUERIDO / TRANSICION_INVALIDA, 500 PDF_NO_GENERADO,
 * 502 ALMACENAMIENTO_NO_DISPONIBLE (el contrato sigue en BORRADOR).
 */
export function firmarContrato(id) {
  return apiRequest(`/contratos/${enc(id)}/firmar`, { method: 'PATCH' })
}

/** PATCH /contratos/{id}/cancelar → 200 ContratoResponse con estado CANCELADO. Sin body. 409 si ya estaba cancelado. */
export function cancelarContrato(id) {
  return apiRequest(`/contratos/${enc(id)}/cancelar`, { method: 'PATCH' })
}

/**
 * GET /contratos/{id}/vista-previa → PDF del borrador ("BORRADOR - SIN VALOR LEGAL"), generado al vuelo.
 * Exige el token: se descarga como `Blob`. 409 DOCUMENTO_NO_DISPONIBLE si ya no es borrador.
 */
export function getVistaPrevia(id, { signal } = {}) {
  return apiRequestPdf(`/contratos/${enc(id)}/vista-previa`, { signal })
}

/**
 * GET /contratos/{id}/documento → { url, version, hashSha256, expiraEn } del PDF firmado.
 * `url` es prefirmada y caduca en ~10 min: pedirla en cada clic y abrirla sin el header Authorization.
 */
export function getDocumento(id, { signal } = {}) {
  return apiRequest(`/contratos/${enc(id)}/documento`, { signal })
}
