import { apiRequest } from './client'

export const TAMANIO_PAGINA = 20

const enc = encodeURIComponent

export function getContador({ signal } = {}) {
  return apiRequest('/notificaciones/no-leidas/contador', { signal })
}

export function listNotificaciones({ soloNoLeidas = false, pagina = 0, tamanio = TAMANIO_PAGINA, signal } = {}) {
  const params = new URLSearchParams({ pagina: String(pagina), tamanio: String(tamanio) })
  if (soloNoLeidas) params.set('soloNoLeidas', 'true')
  return apiRequest(`/notificaciones?${params}`, { signal })
}

export function marcarLeida(id, { signal } = {}) {
  return apiRequest(`/notificaciones/${enc(id)}/leida`, { method: 'PATCH', signal })
}

export function marcarTodasLeidas({ signal } = {}) {
  return apiRequest('/notificaciones/leer-todas', { method: 'PATCH', signal })
}
