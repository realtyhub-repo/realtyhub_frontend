/**
 * Vocabulario, permisos y errores de contratos (docs/contratos-service.md).
 * Precios en pesos colombianos sin decimales (`formatPrice` de lib/property); fechas sin zona, mostradas tal cual.
 */
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseLocal } from '@/lib/visit'

export const TIPO_CONTRATO_LABELS = { COMPRAVENTA: 'Compraventa', ALQUILER: 'Alquiler', ARRAS: 'Arras' }
export const ESTADO_CONTRATO_LABELS = { BORRADOR: 'Borrador', FIRMADO: 'Firmado', CANCELADO: 'Cancelado' }
export const ESTADO_CONTRATO_BADGE = { BORRADOR: 'warning', FIRMADO: 'success', CANCELADO: 'outline' }

/** Roles con listado propio (`mis-contratos`). El admin solo abre detalles; el gerente no ve contratos. */
export const ROLES_LISTA_CONTRATOS = ['AGENTE', 'CLIENTE']
export const ROLES_DETALLE_CONTRATO = ['AGENTE', 'CLIENTE', 'ADMINISTRADOR_CENTRAL']

/** Editar precio, firmar y cancelar: agente del contrato o administrador central, nunca el cliente. */
export function canManageContrato(rol) {
  return rol === 'AGENTE' || rol === 'ADMINISTRADOR_CENTRAL'
}

/** "16 oct 2026, 09:30" a partir de "2026-10-16T09:30:00", sin convertir zona horaria. */
export function formatFechaHora(iso) {
  const d = parseLocal(iso)
  return d ? format(d, "d MMM yyyy, HH:mm", { locale: es }) : '—'
}

/** "16 de octubre de 2026" */
export function formatFechaLarga(iso) {
  const d = parseLocal(iso)
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'
}

/** docs/contratos-service.md §Mensajes de error. Se decide por `codigo`, nunca por `mensaje`. */
const ERRORES = {
  SOLICITUD_INVALIDA: 'Revisa el precio: debe ser un número mayor que cero.',
  CONTEXTO_INVALIDO: 'Tu sesión expiró. Vuelve a ingresar.',
  ACCESO_NO_AUTORIZADO: 'No tienes permiso sobre este contrato.',
  CONTRATO_NO_ENCONTRADO: 'El contrato no existe.',
  CONTRATO_NO_EDITABLE: 'Este contrato ya no se puede editar.',
  PRECIO_REQUERIDO: 'Define el precio antes de firmar.',
  TRANSICION_INVALIDA: 'Este contrato ya cambió de estado.',
  DOCUMENTO_NO_DISPONIBLE: 'El documento aún no está disponible.',
  PDF_NO_GENERADO: 'No se pudo generar el PDF. Intenta de nuevo.',
  ALMACENAMIENTO_NO_DISPONIBLE: 'No se pudo guardar el documento. Intenta de nuevo.',
  SERVICIO_NO_DISPONIBLE: 'Un servicio no responde. Intenta de nuevo.',
}

/** Tras estos códigos el estado real del contrato es otro: hay que volver a pedir el detalle. */
const RECARGAR = new Set(['CONTRATO_NO_EDITABLE', 'TRANSICION_INVALIDA', 'DOCUMENTO_NO_DISPONIBLE'])
/** Fallos transitorios en los que se ofrece reintentar la misma acción. */
const REINTENTAR = new Set(['PDF_NO_GENERADO', 'ALMACENAMIENTO_NO_DISPONIBLE', 'SERVICIO_NO_DISPONIBLE'])

/** { text, reload, retry } para mostrar un error de Contratos. */
export function contratoErrorInfo(err) {
  const codigo = err?.codigo
  return {
    text: ERRORES[codigo] ?? (err?.status === 403 ? ERRORES.ACCESO_NO_AUTORIZADO : err?.mensaje),
    reload: RECARGAR.has(codigo),
    retry: REINTENTAR.has(codigo) || err?.status >= 500 || err?.status === 0,
  }
}

export function contratoErrorMessage(err) {
  return contratoErrorInfo(err).text
}
