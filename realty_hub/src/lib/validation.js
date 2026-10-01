const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value) {
  if (!value.trim()) return 'Ingresa tu correo'
  if (!EMAIL_RE.test(value.trim())) return 'Ingresa un correo válido'
  return null
}

/** Elimina las claves sin error; devuelve null si no hay ninguno. */
export function compactErrors(errors) {
  const entries = Object.entries(errors).filter(([, v]) => v)
  return entries.length ? Object.fromEntries(entries) : null
}
