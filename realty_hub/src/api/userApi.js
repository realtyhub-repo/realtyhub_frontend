/**
 * User service — generado a partir de docs/openapi/user-service.json + docs/user-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`). Nunca se envían `X-User-Id` / `X-User-Role`: el Gateway
 *   los pone a partir del token (docs §1), aunque el JSON los liste como parámetros.
 * - Públicas (sin token): `GET /oficinas/**` y `GET /agentes/{id}`. El resto usa `apiRequest`
 *   (Authorization + reintento tras refresh ante 401).
 * - `/internal/**` no lo expone el Gateway: no hay funciones para esas rutas.
 * Errores: `ApiError` { mensaje, status }.
 */
import { apiRequest, request } from './client'

export const ROLES = ['ADMINISTRADOR_CENTRAL', 'GERENTE_OFICINA', 'AGENTE', 'CLIENTE']
export const TIPOS_OFICINA = ['CENTRAL', 'SUCURSAL']

const enc = encodeURIComponent

function query(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return qs ? `?${qs}` : ''
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                           */
/* ------------------------------------------------------------------ */

/** GET /users/me → UsuarioDetalleResponse { id, email, nombre, urlFoto, telefono, rol, activo, createdAt }. */
export function getMe({ signal } = {}) {
  return apiRequest('/users/me', { signal })
}

/**
 * PUT /users/me → 204. Body ActualizarPerfilRequest { nombre*, telefono, urlFoto }.
 * Solo se envían los campos que cambiaron (docs §4.7); `nombre` es obligatorio en el schema.
 */
export function updateMe(changes) {
  return apiRequest('/users/me', { method: 'PUT', body: changes })
}

/** GET /users?rol=&activo= → UsuarioDetalleResponse[] (sin paginación). Solo ADMINISTRADOR_CENTRAL. */
export function listUsers({ rol, activo, signal } = {}) {
  return apiRequest(`/users${query({ rol, activo })}`, { signal })
}

/** GET /users/{id} → UsuarioDetalleResponse. Solo ADMINISTRADOR_CENTRAL. */
export function getUser(id, { signal } = {}) {
  return apiRequest(`/users/${enc(id)}`, { signal })
}

/** PUT /users/{id}/role → 204. Body { rolUsuario }. 409 si es uno mismo. */
export function updateUserRole(id, rolUsuario) {
  return apiRequest(`/users/${enc(id)}/role`, { method: 'PUT', body: { rolUsuario } })
}

/** PUT /users/{id}/status → 204. Body { status }: true activa, false desactiva. 409 si es uno mismo. */
export function updateUserStatus(id, status) {
  return apiRequest(`/users/${enc(id)}/status`, { method: 'PUT', body: { status } })
}

/* ------------------------------------------------------------------ */
/* Oficinas                                                           */
/* ------------------------------------------------------------------ */

/**
 * GET /oficinas → OficinaResponse[] (público).
 * OficinaResponse { id, nombre, region, latitud, longitud, tipo, oficinaCentralId, gerenteId }.
 */
export function listOficinas({ signal } = {}) {
  return request('/oficinas', { method: 'GET', signal })
}

/** GET /oficinas/{id} → OficinaResponse (público). */
export function getOficina(id, { signal } = {}) {
  return request(`/oficinas/${enc(id)}`, { method: 'GET', signal })
}

/** GET /oficinas/{id}/sucursales → OficinaResponse[] (público). */
export function listSucursales(id, { signal } = {}) {
  return request(`/oficinas/${enc(id)}/sucursales`, { method: 'GET', signal })
}

/** GET /oficinas/{id}/agentes → AgenteResponse[] (público). */
export function listAgentesDeOficina(id, { signal } = {}) {
  return request(`/oficinas/${enc(id)}/agentes`, { method: 'GET', signal })
}

/**
 * POST /oficinas → 201 OficinaResponse. Solo ADMINISTRADOR_CENTRAL. Se crea sin gerente.
 * Body CrearOficinaRequest { nombre*, region*, latitud*, longitud*, tipo*, oficinaCentralId (solo SUCURSAL) }.
 */
export function createOficina(data) {
  return apiRequest('/oficinas', { method: 'POST', body: data })
}

/**
 * PUT /oficinas/{id} → 200 OficinaResponse. Solo ADMINISTRADOR_CENTRAL.
 * Body parcial { nombre, region, latitud, longitud }; debe llevar al menos `nombre` o `region`.
 * Tipo y oficina central no se pueden cambiar.
 */
export function updateOficina(id, changes) {
  return apiRequest(`/oficinas/${enc(id)}`, { method: 'PUT', body: changes })
}

/** PUT /oficinas/{id}/gerente → 204. Body { gerenteId }. Reemplaza al gerente actual si lo había. */
export function asignarGerente(id, gerenteId) {
  return apiRequest(`/oficinas/${enc(id)}/gerente`, { method: 'PUT', body: { gerenteId } })
}

/** DELETE /oficinas/{id}/gerente → 204. 409 si la oficina no tenía gerente. */
export function quitarGerente(id) {
  return apiRequest(`/oficinas/${enc(id)}/gerente`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/* Agentes                                                            */
/* ------------------------------------------------------------------ */

/**
 * GET /agentes/{id} → AgenteResponse (público), con `id` = id del registro de agente (no el `usuarioId`).
 * AgenteResponse { id, usuarioId, nombreUsuario, oficinaId, nombreOficina, zonaEspecialidad }.
 */
export function getAgente(id, { signal } = {}) {
  return request(`/agentes/${enc(id)}`, { method: 'GET', signal })
}

/**
 * GET /agentes/usuario/{usuarioId} → AgenteResponse, buscando por el `usuarioId` del agente: el `agenteId` que
 * usan propiedades, leads, visitas y contratos. 404 si ese usuario no está registrado como agente.
 * Aún no figura en docs/openapi/user-service.json; se asume la misma respuesta y visibilidad que `GET /agentes/{id}`.
 * Si hay sesión se manda el token (sin forzar refresh), por si el Gateway la exige.
 */
export function getAgentePorUsuario(usuarioId, { signal } = {}) {
  return request(`/agentes/usuario/${enc(usuarioId)}`, { method: 'GET', auth: true, signal })
}

/**
 * POST /agentes → 200 AgenteResponse. ADMINISTRADOR_CENTRAL, o GERENTE_OFICINA para su oficina.
 * Body CrearAgenteRequest { usuarioId*, oficinaId*, zonaEspecialidad }.
 */
export function createAgente(data) {
  return apiRequest('/agentes', { method: 'POST', body: data })
}

/**
 * PUT /agentes/{id} → 204, con `id` = id del registro de agente.
 * Body ActualizarAgenteRequest { oficinaId*, zonaEspecialidad } (zona null = se conserva).
 */
export function updateAgente(id, data) {
  return apiRequest(`/agentes/${enc(id)}`, { method: 'PUT', body: data })
}
