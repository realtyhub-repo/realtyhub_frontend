/**
 * Auth service — generado a partir de docs/openapi/auth_service.json + docs/auth_service.md.
 * Todas las rutas son públicas (sin Authorization). Errores: `ApiError` { mensaje, status }.
 */
import { refreshSession, request, setAccessToken } from './client'

/** POST /auth/login → 200 { accessToken } + cookie refresh_token. Errores: 400, 401, 403, 409, 500. */
export async function login({ email, password }) {
  const data = await request('/auth/login', { body: { email, password } })
  return setAccessToken(data.accessToken)
}

/** POST /auth/google → 200 { accessToken }. `idToken` es `credential` de Google Identity Services. */
export async function loginWithGoogle(idToken) {
  const data = await request('/auth/google', { body: { id_token: idToken } })
  return setAccessToken(data.accessToken)
}

/** POST /auth/register → 201 sin body. No inicia sesión: requiere verificar el correo. Errores: 400, 409. */
export function register({ email, password, confirmPassword, nombre }) {
  return request('/auth/register', { body: { email, password, confirmPassword, nombre } })
}

/** GET /auth/verify-email?token= → 200. Token de un solo uso. Errores: 400, 404. */
export function verifyEmail(token) {
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'GET' })
}

/** POST /auth/resend-verification → siempre 200 (respuesta neutral). */
export function resendVerification(email) {
  return request('/auth/resend-verification', { body: { email } })
}

/** POST /auth/forgot-password → siempre 200 (respuesta neutral). */
export function forgotPassword(email) {
  return request('/auth/forgot-password', { body: { email } })
}

/** POST /auth/reset-password → 200. Error 400 si el token expiró/se usó o la contraseña es inválida. */
export function resetPassword({ token, password, confirmPassword }) {
  return request('/auth/reset-password', { body: { token, password, confirmPassword } })
}

/** POST /auth/refresh (sin body) → 200 { accessToken }. 401 si no hay sesión. */
export const refresh = refreshSession

/** POST /auth/logout (sin body). La sesión local se limpia aunque la petición falle. */
export async function logout() {
  try {
    await request('/auth/logout')
  } catch {
    // 401 si ya no había cookie: da igual, cerramos sesión igualmente.
  } finally {
    setAccessToken(null)
  }
}

/* Validación de contraseña compartida con el servidor: ^(?=.*[A-Z])(?=.*[0-9]).{8,}$ */
export const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'Un número', test: (v) => /[0-9]/.test(v) },
]

export const isValidPassword = (v) => PASSWORD_RULES.every((r) => r.test(v))

/** Limpia la sesión solo en esta pestaña (p. ej. cuando otra pestaña ya hizo logout). */
export const logoutLocal = () => setAccessToken(null)
