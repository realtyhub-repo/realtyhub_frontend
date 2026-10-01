/**
 * Cliente HTTP base de RealtyHub.
 *
 * - Centraliza la URL base y el manejo del access token (ver docs/auth_service.md §2 y §6).
 * - El access token vive SOLO en memoria. El refresh token es una cookie HttpOnly que el
 *   navegador gestiona; nunca se lee desde JS.
 * - `refreshSession()` es single-flight: una sola llamada a /auth/refresh a la vez. Reutilizar un
 *   refresh token ya rotado hace que el servidor cierre TODAS las sesiones del usuario.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const GENERIC_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo.'
const NETWORK_ERROR = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'

/** Error de API con el formato estándar del backend: { mensaje, status, timestamp }. */
export class ApiError extends Error {
  constructor({ mensaje, status, timestamp } = {}) {
    super(mensaje || GENERIC_ERROR)
    this.name = 'ApiError'
    this.mensaje = this.message
    this.status = status ?? 0
    this.timestamp = timestamp ?? null
  }
}

async function toApiError(res) {
  // Los 5xx muestran un mensaje genérico (docs §4); los 4xx traen `mensaje` listo para el usuario.
  if (res.status >= 500) return new ApiError({ mensaje: GENERIC_ERROR, status: res.status })
  try {
    const body = await res.json()
    return new ApiError({ ...body, status: body?.status ?? res.status })
  } catch {
    return new ApiError({ mensaje: GENERIC_ERROR, status: res.status })
  }
}

async function parseBody(res) {
  // Muchos endpoints responden 200/201 sin body.
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/**
 * Petición JSON al API. Lanza `ApiError` en respuestas no-2xx o errores de red.
 * `credentials: 'include'` siempre: sin eso la cookie de refresh no se guarda ni se envía.
 */
export async function request(path, { method = 'POST', body, headers, auth = false, signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError({ mensaje: NETWORK_ERROR, status: 0 })
  }
  if (!res.ok) throw await toApiError(res)
  return parseBody(res)
}

/* ------------------------------------------------------------------ */
/* Sesión: access token en memoria + suscriptores                     */
/* ------------------------------------------------------------------ */

let accessToken = null
let refreshPromise = null
const listeners = new Set()

/** Decodifica el payload del JWT (sin validar firma: eso lo hace el gateway). */
export function decodeJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)))
  return JSON.parse(json)
}

function toSession(token) {
  const { sub, rol, exp } = decodeJwt(token)
  return { id: sub, rol, exp }
}

export function getAccessToken() {
  return accessToken
}

/** Guarda (o borra, con null) el access token y notifica a los suscriptores. Devuelve la sesión. */
export function setAccessToken(token) {
  accessToken = token
  const session = token ? toSession(token) : null
  listeners.forEach((fn) => fn(session))
  return session
}

/** Se ejecuta cada vez que cambia la sesión (login, refresh, logout, sesión expirada). */
export function onSessionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function doRefresh() {
  const data = await request('/auth/refresh')
  return setAccessToken(data.accessToken)
}

/**
 * Obtiene un nuevo access token con la cookie de refresh.
 * - Single-flight dentro de la pestaña (StrictMode, varios 401 simultáneos).
 * - Entre pestañas se serializa con Web Locks: la cookie es compartida y cada refresh la rota,
 *   así que dos pestañas refrescando a la vez dispararían la detección de robo del backend.
 * Si falla, limpia la sesión y relanza el error.
 */
export function refreshSession() {
  if (!refreshPromise) {
    const run = navigator.locks?.request
      ? navigator.locks.request('realtyhub:auth-refresh', doRefresh)
      : doRefresh()
    refreshPromise = run
      .catch((err) => {
        setAccessToken(null)
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/**
 * Llamada autenticada a otros microservicios. Ante un 401 renueva el token y reintenta UNA vez.
 * Si el refresh falla, la sesión queda limpia y el AuthProvider redirige a login.
 */
export async function apiRequest(path, options = {}) {
  try {
    return await request(path, { method: 'GET', ...options, auth: true })
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err
    await refreshSession()
    return request(path, { method: 'GET', ...options, auth: true })
  }
}
