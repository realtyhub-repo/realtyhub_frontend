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

/** Valida coordenadas antes de enviarlas (rangos de docs/property-service.md §4.5 y docs/user-service.md §4.4). Devuelve el error o null. */
export function coordsError(coords, emptyMessage = 'Marca la ubicación en el mapa') {
  if (!coords || !Number.isFinite(coords.latitud) || !Number.isFinite(coords.longitud)) return emptyMessage
  if (Math.abs(coords.latitud) > 90 || Math.abs(coords.longitud) > 180) return 'Las coordenadas están fuera de rango'
  return null
}
