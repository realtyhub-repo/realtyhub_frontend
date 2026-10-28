import { Ban, Bell, CalendarCheck, CalendarX, CircleCheck, Clock, Coins, FileText, Undo2 } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { ROLES_COMISIONES } from '@/lib/commission'
import { ROLES_DETALLE_CONTRATO } from '@/lib/contract'

export const TIPO_NOTIFICACION = {
  VISITA_AGENDADA: { icon: CalendarCheck, tone: 'text-emerald-depths' },
  VISITA_CANCELADA: { icon: CalendarX, tone: 'text-error' },
  RECORDATORIO_VISITA_24H: { icon: Clock, tone: 'text-evergreen' },
  RECORDATORIO_VISITA_1H: { icon: Clock, tone: 'text-warning' },
  OFERTA_ACEPTADA: { icon: CircleCheck, tone: 'text-success' },
  CONTRATO_FIRMADO: { icon: FileText, tone: 'text-success' },
  CONTRATO_CANCELADO: { icon: FileText, tone: 'text-error' },
  COMISION_CREADA: { icon: Coins, tone: 'text-evergreen' },
  COMISION_APROBADA: { icon: Coins, tone: 'text-emerald-depths' },
  COMISION_PAGADA: { icon: Coins, tone: 'text-success' },
  COMISION_ANULADA: { icon: Ban, tone: 'text-error' },
  COMISION_REVERTIDA: { icon: Undo2, tone: 'text-warning' },
}

export const TIPO_NOTIFICACION_DEFAULT = { icon: Bell, tone: 'text-evergreen' }

export function destinoNotificacion(notificacion, rol) {
  const { tipo, referenciaId } = notificacion

  if (tipo.startsWith('VISITA_') || tipo.startsWith('RECORDATORIO_VISITA')) return '/panel/visitas'

  if (tipo === 'OFERTA_ACEPTADA') {
    if (rol === 'CLIENTE') return '/panel/contratos'
    return referenciaId ? `/panel/leads/${referenciaId}` : '/panel/leads'
  }

  if (tipo.startsWith('CONTRATO_')) {
    if (ROLES_DETALLE_CONTRATO.includes(rol) && referenciaId) return `/panel/contratos/${referenciaId}`
    return '/panel/contratos'
  }

  if (tipo.startsWith('COMISION_')) {
    if (!ROLES_COMISIONES.includes(rol)) return null
    return referenciaId ? `/panel/comisiones/${referenciaId}` : '/panel/comisiones'
  }

  return null
}

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function tiempoRelativo(iso, now = Date.now()) {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 60) return 'Hace un momento'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return relativo.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relativo.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return relativo.format(-days, 'day')
  return formatDate(iso, { dateStyle: 'medium' })
}

export function fechaCompleta(iso) {
  return formatDate(iso, { dateStyle: 'long', timeStyle: 'short' })
}
