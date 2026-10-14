/**
 * Property service — generado a partir de docs/openapi/property-service.json + docs/property-service.md.
 *
 * - Todo pasa por el Gateway (`API_BASE_URL`). Nunca se envían `X-User-Id` / `X-User-Role` (docs §1).
 * - Públicas: todos los `GET /propiedades/**`. El detalle manda el token si hay sesión para que la vista
 *   no cuente cuando la abre el agente dueño (docs §4.2).
 * - Escritura (crear, editar, estado, imágenes): `apiRequest` (Authorization + reintento tras refresh).
 * - `/internal/**` no lo expone el Gateway: no hay funciones para esas rutas.
 * Errores: `ApiError` { mensaje, status }.
 */
import { ApiError, apiRequest, request } from './client'

export const TIPOS_PROPIEDAD = ['CASA', 'APARTAMENTO']
export const MODALIDADES = ['VENTA', 'ALQUILER']
export const ESTADOS_COMERCIALES = ['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'ALQUILADO']

/** Extensiones que acepta el backend para las fotos (docs §4.6). */
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

const enc = encodeURIComponent

function query(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/* ------------------------------------------------------------------ */
/* Propiedades                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET /propiedades → PagedModel { content: PropiedadResponse[], page: { size, number, totalElements, totalPages } }.
 * PropiedadResponse (liviana) { id, titulo, precio, ciudad, tipoPropiedad, modalidad, estadoComercial, urlPortada }.
 * Filtros opcionales: tipoPropiedad, modalidad, estadoComercial, ciudad, precioMin, precioMax.
 * Paginación de Spring: `page` (desde 0), `size`, `sort` ("campo,asc|desc").
 */
export function listPropiedades({ signal, ...params } = {}) {
  return request(`/propiedades${query(params)}`, { method: 'GET', signal })
}

/**
 * GET /propiedades/{id} → PropiedadDetalleResponse { id, titulo, descripcion, precio, direccion, ciudad, latitud,
 * longitud, tipoPropiedad, modalidad, estadoComercial, caracteristicas, agenteId, nombreAgente, imagenes[], createdAt }.
 * `agenteId` es el id del USUARIO dueño (no el agente_id). `imagenes` ya viene ordenada.
 */
export function getPropiedad(id, { signal } = {}) {
  return request(`/propiedades/${enc(id)}`, { method: 'GET', auth: true, signal })
}

/**
 * POST /propiedades → 201 PropiedadResponse. Nace DISPONIBLE y queda a nombre de quien la crea.
 * Body CrearPropiedadRequest { titulo*, descripcion*, precio*, direccion*, ciudad*, latitud*, longitud*,
 * tipoPropiedad*, modalidad*, caracteristicas }. `agenteId` nunca se envía (docs §2).
 */
export function createPropiedad(data) {
  return apiRequest('/propiedades', { method: 'POST', body: data })
}

/**
 * PUT /propiedades/{id} → 200 PropiedadResponse. Actualización parcial: solo los campos que cambiaron (docs §4.8).
 * `caracteristicas`, si va, reemplaza el objeto completo. Tipo, modalidad y estado no se editan aquí.
 */
export function updatePropiedad(id, changes) {
  return apiRequest(`/propiedades/${enc(id)}`, { method: 'PUT', body: changes })
}

/** PUT /propiedades/{id}/estado → 204. Body { nuevoEstado }. Cambio libre entre los cuatro estados. */
export function cambiarEstado(id, nuevoEstado) {
  return apiRequest(`/propiedades/${enc(id)}/estado`, { method: 'PUT', body: { nuevoEstado } })
}

/* ------------------------------------------------------------------ */
/* Imágenes                                                           */
/* ------------------------------------------------------------------ */

/** POST /propiedades/{id}/imagenes/upload-urls → UploadUrlResponse[] { key, uploadUrl }, en el mismo orden. */
export function generarUrlsSubida(id, nombresArchivo) {
  return apiRequest(`/propiedades/${enc(id)}/imagenes/upload-urls`, { method: 'POST', body: { nombresArchivo } })
}

/**
 * POST /propiedades/{id}/imagenes/confirmar → 201 ImagenResponse[].
 * Body: [{ key, esPortada }]. El orden del arreglo es el orden de la galería; máximo una portada por lote.
 */
export function confirmarImagenes(id, imagenes) {
  return apiRequest(`/propiedades/${enc(id)}/imagenes/confirmar`, { method: 'POST', body: imagenes })
}

/** PUT /imagenes/{imagenId}/portada → 204. Desmarca la portada anterior. */
export function marcarPortada(imagenId) {
  return apiRequest(`/imagenes/${enc(imagenId)}/portada`, { method: 'PUT' })
}

/** DELETE /imagenes/{imagenId} → 204. Si era la portada, la propiedad queda sin portada (docs §4.7). */
export function eliminarImagen(imagenId) {
  return apiRequest(`/imagenes/${enc(imagenId)}`, { method: 'DELETE' })
}

/** Extensión en minúsculas, o '' si no tiene. */
export function fileExtension(name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

/**
 * PUT directo a R2 con la URL firmada (paso 2 de docs §4.6).
 * Sin Authorization ni cookies, y con `Content-Type` exactamente igual a `file.type` o R2 responde 403.
 * Usa XHR (no fetch) para poder informar el progreso de subida.
 */
function putToStorage(url, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError({ mensaje: 'El almacenamiento rechazó el archivo.', status: xhr.status }))
    xhr.onerror = () => reject(new ApiError({ mensaje: 'No se pudo subir el archivo. Revisa tu conexión.', status: 0 }))
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

/**
 * Sube un lote de fotos en los tres pasos de docs §4.6: pedir URLs, subir cada archivo a R2 en paralelo
 * y confirmar las que subieron, en el orden recibido.
 * - `portadaIndex`: índice del archivo que será portada (o null para no cambiarla).
 * - `onProgress(index, fraccion)`: progreso por archivo, de 0 a 1.
 * Devuelve { imagenes: ImagenResponse[], fallidos: number[] } con los índices que no se pudieron subir.
 * Si ninguno sube, no se confirma nada y se lanza el primer error.
 */
export async function subirImagenes(id, files, { portadaIndex = null, onProgress, signal } = {}) {
  // El backend valida la extensión del nombre: se normaliza a minúsculas ("IMG_01.JPG" → "IMG_01.jpg").
  const nombres = files.map((f) => {
    const ext = fileExtension(f.name)
    return ext ? `${f.name.slice(0, -ext.length)}${ext}` : f.name
  })
  const urls = await generarUrlsSubida(id, nombres)

  const results = await Promise.allSettled(
    files.map((file, i) => putToStorage(urls[i].uploadUrl, file, (p) => onProgress?.(i, p), signal)),
  )
  const subidos = results.flatMap((r, i) => (r.status === 'fulfilled' ? [i] : []))
  const fallidos = results.flatMap((r, i) => (r.status === 'rejected' ? [i] : []))
  if (!subidos.length) throw results[0].reason

  const imagenes = await confirmarImagenes(
    id,
    subidos.map((i) => ({ key: urls[i].key, esPortada: i === portadaIndex })),
  )
  return { imagenes: imagenes ?? [], fallidos }
}
