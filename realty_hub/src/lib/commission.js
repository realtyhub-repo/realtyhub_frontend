/**
 * Vocabulario, permisos, formato y errores de comisiones (docs/comisiones-service.md).
 * Montos en pesos colombianos sin decimales (`formatPrice` de lib/property); fechas sin zona, mostradas tal cual.
 */
import { format, parseISO, startOfDay, startOfYear, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { nowInBogota } from '@/lib/visit'

export const ESTADO_COMISION_LABELS = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
  REVERTIDA: 'Revertida',
}
export const ESTADO_COMISION_BADGE = { PENDIENTE: 'warning', APROBADA: 'neutral', PAGADA: 'success', ANULADA: 'outline', REVERTIDA: 'error' }
export const ESTADOS_FINALES = new Set(['ANULADA', 'REVERTIDA'])

export const BENEFICIARIO_LABELS = { AGENTE: 'Agente', OFICINA: 'Oficina', CENTRAL: 'Central' }
/** Tono de cada línea en la barra del reparto: de más oscuro (agente) a más claro (central). */
export const BENEFICIARIO_TONO = { AGENTE: 'bg-evergreen', OFICINA: 'bg-emerald-depths', CENTRAL: 'bg-pale-oak' }

export const TIPOS_REGLA = ['COMPRAVENTA', 'ALQUILER', 'ARRAS']
export const TIPOS_REGLA_OBLIGATORIOS = ['COMPRAVENTA', 'ALQUILER']
export const BASE_CALCULO_LABELS = { PORCENTAJE_PRECIO: 'Porcentaje del precio', MESES_CANON: 'Meses de canon' }

export const ADMIN = 'ADMINISTRADOR_CENTRAL'
export const GERENTE = 'GERENTE_OFICINA'
export const ROLES_COMISIONES = [ADMIN, GERENTE, 'AGENTE']
export const ROLES_ACUERDOS = [ADMIN, GERENTE]

/** Aprobar: gerente o admin, solo en PENDIENTE y nunca la propia (`agenteId` es el usuario del agente). */
export function canAprobar(c, user) {
  return c?.estado === 'PENDIENTE' && (user.rol === ADMIN || user.rol === GERENTE) && c.agenteId !== user.id
}
export const canPagar = (c, user) => c?.estado === 'APROBADA' && user.rol === ADMIN
export const canRevertir = (c, user) => c?.estado === 'PAGADA' && user.rol === ADMIN

/** La comisión espera una acción de este rol: se destaca en la lista. */
export function requiereAccion(c, user) {
  return canAprobar(c, user) || canPagar(c, user)
}

/** Línea del reparto que representa "lo de este rol": agente → AGENTE, gerente → OFICINA, admin → total. */
const LINEA_POR_ROL = { AGENTE: 'AGENTE', [GERENTE]: 'OFICINA' }

/** { monto, label } que encabeza la fila según el rol (docs §Pantallas 1). */
export function montoPrincipal(c, rol) {
  const tipo = LINEA_POR_ROL[rol]
  const linea = tipo && c.reparto?.find((r) => r.beneficiarioTipo === tipo)
  if (linea) return { monto: linea.monto, label: rol === 'AGENTE' ? 'Tu comisión' : 'Para tu oficina' }
  return { monto: c.montoTotal, label: 'Comisión total' }
}

/** Rótulos del resumen según `perspectiva`, para que nadie confunda "lo mío" con "el total". */
export const PERSPECTIVA = {
  PARTICIPACION_AGENTE: { titulo: 'Tu participación', porCobrar: 'Por cobrar', cobrado: 'Cobrado' },
  PARTICIPACION_OFICINA: { titulo: 'Participación de tu oficina', porCobrar: 'Por cobrar', cobrado: 'Cobrado' },
  MONTO_TOTAL: { titulo: 'Monto total de las comisiones', porCobrar: 'Por pagar', cobrado: 'Pagado' },
}

/** "3 % del precio acordado" / "1 mes de canon" */
export function describeRegla(baseCalculo, valor) {
  const n = formatNumero(valor)
  if (baseCalculo === 'MESES_CANON') return `${n} ${Number(valor) === 1 ? 'mes' : 'meses'} de canon`
  if (baseCalculo === 'PORCENTAJE_PRECIO') return `${n} % del precio acordado`
  return '—'
}

/** 50.00 → "50", 2.5000 → "2,5" */
export function formatNumero(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v.toLocaleString('es-CO', { maximumFractionDigits: 4 }) : '—'
}

/** 50.00 → "50 %" */
export function formatPorcentaje(n) {
  return `${formatNumero(n)} %`
}

/* ------------------------------------------------------------------ */
/* Fechas                                                              */
/* ------------------------------------------------------------------ */

/** Date → "2026-10-18" (filtros `desde`/`hasta` y vigencias). */
export function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd')
}

/** "2026-10-18" → Date local (sin desplazar por zona). */
export function parseIsoDate(s) {
  if (!s) return null
  const d = parseISO(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "18 oct 2026" */
export function formatFechaCorta(s) {
  const d = parseIsoDate(s)
  return d ? format(d, 'd MMM yyyy', { locale: es }) : '—'
}

/** Hoy en Colombia como "AAAA-MM-DD". */
export function hoyIso() {
  return toIsoDate(nowInBogota())
}

/** El acuerdo cubre la fecha (`vigenteHasta` null = sin fecha de fin). Fechas `AAAA-MM-DD`, comparables como texto. */
export function acuerdoVigente(a, fecha = hoyIso()) {
  return !!a && a.vigenteDesde <= fecha && (!a.vigenteHasta || fecha <= a.vigenteHasta)
}

/** Periodos rápidos del filtro; el primero coincide con el rango por defecto del resumen (1 de enero → hoy). */
export function periodosComision(now) {
  const today = startOfDay(now)
  const year = today.getFullYear()
  return [
    { id: 'este-anio', label: 'Este año', from: startOfYear(today), to: today },
    { id: 'ultimos-30', label: 'Últimos 30 días', from: subDays(today, 30), to: today },
    { id: 'ultimos-90', label: 'Últimos 90 días', from: subDays(today, 90), to: today },
    { id: 'anio-anterior', label: `Año ${year - 1}`, from: new Date(year - 1, 0, 1), to: new Date(year - 1, 11, 31) },
  ]
}

/* ------------------------------------------------------------------ */
/* Errores                                                             */
/* ------------------------------------------------------------------ */

/** docs/comisiones-service.md §Mensajes de error. Se decide por `codigo`, nunca por `mensaje`. */
const ERRORES = {
  SOLICITUD_INVALIDA: 'Revisa los datos enviados.',
  RANGO_FECHAS_INVALIDO: 'La fecha inicial no puede ser posterior a la final.',
  CONTEXTO_INVALIDO: 'Tu sesión expiró. Vuelve a ingresar.',
  ACCESO_NO_AUTORIZADO: 'No tienes permiso para esta acción.',
  COMISION_NO_ENCONTRADA: 'La comisión no existe.',
  ACUERDO_NO_ENCONTRADO: 'El acuerdo no existe.',
  ACUERDO_SOLAPADO: 'La vigencia se cruza con otro acuerdo. Cierra el acuerdo vigente primero.',
  TRANSICION_INVALIDA: 'Esta comisión ya cambió de estado.',
  CONFLICTO_CONCURRENTE: 'Otra persona acaba de modificar esta comisión.',
  SERVICIO_NO_DISPONIBLE: 'Un servicio no responde. Intenta de nuevo.',
}

/** Tras estos códigos el estado real es otro: hay que volver a pedir el detalle. */
const RECARGAR = new Set(['TRANSICION_INVALIDA', 'CONFLICTO_CONCURRENTE'])

/** { text, reload, retry } para mostrar un error de Comisiones. ACUERDO_INVALIDO muestra el `mensaje` del backend. */
export function comisionErrorInfo(err) {
  const codigo = err?.codigo
  const text =
    codigo === 'ACUERDO_INVALIDO'
      ? err.mensaje
      : (ERRORES[codigo] ??
        (err?.status === 403 ? ERRORES.ACCESO_NO_AUTORIZADO : err?.status === 404 ? 'Comisiones no está disponible en el servidor.' : err?.mensaje))
  return {
    text,
    reload: RECARGAR.has(codigo),
    retry: codigo === 'SERVICIO_NO_DISPONIBLE' || err?.status >= 500 || err?.status === 0,
  }
}
