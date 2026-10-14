/**
 * Vocabulario y formato de propiedades (docs/property-service.md §4.3 y §4.4).
 * Los valores del backend van en mayúsculas; aquí se traducen a modo oración (CLAUDE.md §3).
 */

export const TIPO_LABELS = { CASA: 'Casa', APARTAMENTO: 'Apartamento' }
export const MODALIDAD_LABELS = { VENTA: 'Venta', ALQUILER: 'Alquiler' }
/** "Casa en venta", "Apartamento en alquiler". */
export const MODALIDAD_FRASE = { VENTA: 'en venta', ALQUILER: 'en alquiler' }
export const ESTADO_LABELS = { DISPONIBLE: 'Disponible', RESERVADO: 'Reservada', VENDIDO: 'Vendida', ALQUILADO: 'Alquilada' }
/** Variante de Badge por estado: color + peso, nunca mayúsculas. */
export const ESTADO_BADGE = { DISPONIBLE: 'success', RESERVADO: 'warning', VENDIDO: 'neutral', ALQUILADO: 'neutral' }

const priceFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const numberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

/** Precio en pesos sin decimales ("$ 350.000.000"). */
export function formatPrice(n) {
  return typeof n === 'number' && Number.isFinite(n) ? priceFormat.format(n) : '—'
}

/** Precio compacto para espacios cortos ("$ 350 M", "$ 2,5 M", "$ 950 mil"). */
export function formatPriceShort(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return `$ ${numberFormat.format(Math.round(n / 1e8) / 10)} mil M`
  if (n >= 1e6) return `$ ${numberFormat.format(Math.round(n / 1e5) / 10)} M`
  if (n >= 1e3) return `$ ${numberFormat.format(Math.round(n / 1e3))} mil`
  return priceFormat.format(n)
}

export function formatNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? numberFormat.format(n) : '—'
}

/** "350000000" ↔ "350.000.000" para los campos de precio mientras se escribe. */
export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '')
}
export function groupDigits(digits) {
  return digits ? numberFormat.format(Number(digits)) : ''
}

/* ------------------------------------------------------------------ */
/* Características según el tipo                                      */
/* ------------------------------------------------------------------ */

/*
 * `caracteristicas` es un JSON libre que el backend no valida (docs §4.4): este catálogo es el contrato
 * del frontend. `type`: 'int' | 'decimal' | 'money' | 'bool'. Las claves se guardan tal cual en el JSON.
 */
const habitaciones = { key: 'habitaciones', label: 'Habitaciones', type: 'int', required: true, min: 0, max: 50 }
const banos = { key: 'banos', label: 'Baños', type: 'int', required: true, min: 0, max: 50 }
const parqueaderos = { key: 'parqueaderos', label: 'Parqueaderos', type: 'int', min: 0, max: 50 }
const estrato = { key: 'estrato', label: 'Estrato', type: 'int', min: 1, max: 6 }

export const CARACTERISTICAS = {
  CASA: [
    habitaciones,
    banos,
    { key: 'area_m2', label: 'Área construida', type: 'decimal', unit: 'm²', required: true, min: 1 },
    { key: 'area_lote_m2', label: 'Área del lote', type: 'decimal', unit: 'm²', min: 1 },
    { key: 'niveles', label: 'Niveles', type: 'int', min: 1, max: 10 },
    parqueaderos,
    estrato,
    { key: 'patio', label: 'Patio o jardín', type: 'bool' },
  ],
  APARTAMENTO: [
    habitaciones,
    banos,
    { key: 'area_m2', label: 'Área privada', type: 'decimal', unit: 'm²', required: true, min: 1 },
    { key: 'piso', label: 'Piso', type: 'int', min: 0, max: 200 },
    parqueaderos,
    estrato,
    { key: 'administracion', label: 'Administración mensual', type: 'money' },
    { key: 'ascensor', label: 'Ascensor', type: 'bool' },
    { key: 'balcon', label: 'Balcón o terraza', type: 'bool' },
  ],
}

const ALL_FIELDS = new Map(Object.values(CARACTERISTICAS).flat().map((f) => [f.key, f]))

/** "area_construida" → "Area construida" para claves que este frontend no conoce. */
function prettyKey(key) {
  const s = key.replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatValue(field, value) {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number') {
    if (field?.type === 'money') return formatPrice(value)
    return field?.unit ? `${formatNumber(value)} ${field.unit}` : formatNumber(value)
  }
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/**
 * Lista legible de características para el detalle: primero las conocidas (en el orden del catálogo del
 * tipo), después cualquier otra clave que venga en el JSON. Omite los valores vacíos.
 */
export function describeCaracteristicas(caracteristicas, tipo) {
  const data = caracteristicas && typeof caracteristicas === 'object' ? caracteristicas : {}
  const own = new Map((CARACTERISTICAS[tipo] ?? []).map((f) => [f.key, f]))
  const known = [...own.keys()]
  const keys = [...known.filter((k) => k in data), ...Object.keys(data).filter((k) => !known.includes(k))]
  return keys.flatMap((key) => {
    // La etiqueta sale del catálogo del propio tipo ("Área construida" en casa, "Área privada" en apartamento).
    const field = own.get(key) ?? ALL_FIELDS.get(key)
    const value = formatValue(field, data[key])
    return value === null ? [] : [{ key, label: field?.label ?? prettyKey(key), value, raw: data[key] }]
  })
}

/** Datos clave para tarjetas y cabeceras: habitaciones, baños y área, si existen. */
export function keyFacts(caracteristicas) {
  const c = caracteristicas ?? {}
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return { habitaciones: n(c.habitaciones), banos: n(c.banos), area: n(c.area_m2), parqueaderos: n(c.parqueaderos) }
}

/** Puede editar: el agente dueño (`agenteId` = id de usuario) o el administrador central (docs §2). */
export function canManage(propiedad, user) {
  return !!user && !!propiedad && (propiedad.agenteId === user.id || user.rol === 'ADMINISTRADOR_CENTRAL')
}

/** Roles que pueden publicar propiedades (docs §2). */
export const PUBLISHER_ROLES = ['ADMINISTRADOR_CENTRAL', 'GERENTE_OFICINA', 'AGENTE']
