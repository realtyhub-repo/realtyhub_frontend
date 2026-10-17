/** Campos de `current` cuyo valor (ya normalizado) difiere de `initial` (docs/user-service.md §4.7). */
export function changedFields(initial, current) {
  return Object.fromEntries(Object.entries(current).filter(([k, v]) => v !== (initial[k] ?? '')))
}

/** Fechas del backend: ISO-8601 sin zona horaria. */
export function formatDate(iso, options = { dateStyle: 'medium' }) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es', options)
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '·'
}

export function formatCoord(n) {
  return typeof n === 'number' ? n.toFixed(5) : '—'
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Enlace de WhatsApp (`wa.me`) para un teléfono libre ("+57 300 123 4567", "3001234567").
 * Un celular colombiano de 10 dígitos sin indicativo se completa con 57. Null si no hay dígitos suficientes.
 */
export function whatsappUrl(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('3')) digits = `57${digits}`
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

/** `tel:` sin espacios ni separadores, conservando el "+" inicial. */
export function telHref(phone) {
  const s = String(phone ?? '').trim()
  return `tel:${s.startsWith('+') ? '+' : ''}${s.replace(/\D/g, '')}`
}
