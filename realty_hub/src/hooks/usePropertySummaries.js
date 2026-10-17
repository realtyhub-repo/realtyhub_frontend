import { useEffect, useState } from 'react'
import { getPropiedad } from '@/api/propertyApi'

// Caché de la sesión de la página: las visitas y leads solo traen `propiedadId`, y la misma propiedad
// aparece muchas veces. Se guarda la promesa para no pedir dos veces la misma en paralelo.
const cache = new Map()

function load(id) {
  if (!cache.has(id)) {
    const p = getPropiedad(id).then(
      (d) => ({ id: d.id, titulo: d.titulo, ciudad: d.ciudad, direccion: d.direccion, precio: d.precio, modalidad: d.modalidad, tipo: d.tipoPropiedad, estadoComercial: d.estadoComercial, foto: d.imagenes?.find((i) => i.esPortada)?.url ?? d.imagenes?.[0]?.url ?? null }),
      () => {
        cache.delete(id) // permitir reintentar en la próxima carga
        return { id, titulo: null, missing: true }
      },
    )
    cache.set(id, p)
  }
  return cache.get(id)
}

/**
 * Resumen { titulo, ciudad, direccion, precio, modalidad, tipo, estadoComercial, foto } de cada propiedad, por id (`GET /propiedades/{id}`).
 * Devuelve un objeto { [id]: resumen } que se va llenando a medida que llegan las respuestas.
 */
export function usePropertySummaries(ids) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(',')
  const [map, setMap] = useState({})

  useEffect(() => {
    if (!key) return
    let alive = true
    for (const id of key.split(',')) {
      load(id).then((summary) => alive && setMap((m) => (m[id] === summary ? m : { ...m, [id]: summary })))
    }
    return () => {
      alive = false
    }
  }, [key])

  return map
}
