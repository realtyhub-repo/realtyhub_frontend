import { MapPinOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Sin oficinas ni pin todavía: vista amplia de partida centrada en Montería. MapLibre usa [lng, lat].
const DEFAULT_CENTER = [-75.881404, 8.747943]
// OpenFreeMap: tiles vectoriales de OpenStreetMap sin token ni cuota. Positron es el estilo claro y neutro.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

// MapLibre posiciona el elemento del marcador con `transform: translate(x, y)`. Si ese mismo elemento lleva
// `scale-*` (Tailwind v4 usa la propiedad `scale`), el navegador escala también el desplazamiento y el punto
// queda lejos de su ubicación y se mueve más rápido que el mapa al arrastrar. Por eso el exterior queda sin
// estilo y el círculo visible (con su escala y transición) es un hijo que lee el estado vía `group-data-*`.
const markerBase = 'group block cursor-pointer'

const markerDot =
  'block size-4 rounded-full border-2 border-floral-white bg-evergreen shadow-[0_1px_4px_rgb(10_59_53/0.45)] transition-[scale,background-color,box-shadow] duration-200 ease-out group-hover:scale-125 group-data-[active=true]:scale-150 group-data-[active=true]:bg-emerald-depths group-data-[active=true]:shadow-[0_0_0_6px_rgb(216_194_164/0.55)] group-data-[tipo=CENTRAL]:size-5'

const pinClass =
  'block size-6 rounded-full border-[3px] border-floral-white bg-evergreen shadow-[0_0_0_8px_rgb(42_97_81/0.18),0_2px_6px_rgb(10_59_53/0.4)]'

/** Carga maplibre-gl solo cuando hace falta un mapa: es pesado y casi ninguna pantalla lo usa. */
let maplibrePromise
function loadMaplibre() {
  maplibrePromise ??= Promise.all([
    import('maplibre-gl'),
    // El worker vive en un archivo aparte que el bundler no copia solo: se emite como asset y se le indica la URL.
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]).then(([m, worker]) => {
    m.setWorkerUrl(worker.default)
    return m
  })
  return maplibrePromise
}

/**
 * Mapa de oficinas (MapLibre + OpenFreeMap, docs/user-service.md §4.4).
 * - `offices`: marcadores { id, nombre, latitud, longitud, tipo }. `activeId` resalta uno; `focusId`
 *   (por defecto el mismo) centra el mapa en él. Separarlos permite resaltar al pasar el cursor sin mover el mapa.
 * - `onSelect(id)`: clic en un marcador.
 * - `pick` + `onPick({ latitud, longitud })`: modo selector; un clic coloca el pin y entrega las coordenadas.
 * - `onUnavailable()`: el mapa no pudo cargar (sin red, WebGL o servidor de tiles caído).
 */
export function OfficeMap({ offices = [], activeId, focusId = activeId, onSelect, pick, onPick, onUnavailable, zoom = 13, className, label = 'Mapa de oficinas' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const pinRef = useRef(null)
  const callbacks = useRef({ onSelect, onPick, onUnavailable })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    callbacks.current = { onSelect, onPick, onUnavailable }
  })

  useEffect(() => {
    if (failed) callbacks.current.onUnavailable?.()
  }, [failed])

  // Crear el mapa una sola vez.
  useEffect(() => {
    const markers = markersRef.current
    let cancelled = false
    let map
    let styleLoaded = false
    loadMaplibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return
        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 11,
          cooperativeGestures: !onPick,
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        map.on('click', (e) => {
          callbacks.current.onPick?.({
            latitud: Number(e.lngLat.lat.toFixed(6)),
            longitud: Number(e.lngLat.lng.toFixed(6)),
          })
        })
        if (onPick) map.getCanvas().style.cursor = 'crosshair'
        map.on('style.load', () => {
          styleLoaded = true
        })
        map.on('load', () => !cancelled && setReady(true))
        map.on('error', () => {
          // Sin estilo (servidor de tiles caído, sin red, worker que no carga) solo quedaría un recuadro vacío:
          // mostrar el aviso. Un tile suelto que falla después no justifica tirar el mapa entero.
          if (!styleLoaded && !cancelled) setFailed(true)
        })
        mapRef.current = { map, maplibregl }
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
      markers.clear()
      pinRef.current = null
      setReady(false)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- el modo selector no cambia en vida del mapa
  }, [])

  // Sincronizar marcadores de oficinas y encuadrar.
  useEffect(() => {
    if (!ready) return
    const { map, maplibregl } = mapRef.current
    const markers = markersRef.current
    markers.forEach((m) => m.remove())
    markers.clear()

    const valid = offices.filter((o) => Number.isFinite(o.latitud) && Number.isFinite(o.longitud))
    for (const o of valid) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = markerBase
      el.dataset.tipo = o.tipo
      el.setAttribute('aria-label', o.nombre)
      el.title = o.nombre
      const dot = document.createElement('span')
      dot.className = markerDot
      el.append(dot)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        callbacks.current.onSelect?.(o.id)
      })
      markers.set(o.id, new maplibregl.Marker({ element: el }).setLngLat([o.longitud, o.latitud]).addTo(map))
    }

    if (valid.length === 1) {
      map.jumpTo({ center: [valid[0].longitud, valid[0].latitud], zoom })
    } else if (valid.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      valid.forEach((o) => bounds.extend([o.longitud, o.latitud]))
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 })
    }
  }, [ready, offices, zoom])

  // Resaltar la oficina activa; centrar la enfocada.
  useEffect(() => {
    if (!ready) return
    markersRef.current.forEach((marker, id) => {
      marker.getElement().dataset.active = String(id === activeId)
    })
  }, [ready, activeId, offices])

  useEffect(() => {
    if (!ready) return
    const focused = markersRef.current.get(focusId)
    if (focused) mapRef.current.map.easeTo({ center: focused.getLngLat(), zoom: Math.max(mapRef.current.map.getZoom(), 13), duration: 600 })
  }, [ready, focusId, offices])

  // Pin del modo selector.
  useEffect(() => {
    if (!ready || !onPick) return
    const { map, maplibregl } = mapRef.current
    // Con coordenadas escritas a mano pueden llegar valores fuera de rango: MapLibre rechaza la latitud y, con una
    // longitud enorme, el marcador la envuelve de a 360° en un bucle que congela la página.
    if (
      !pick ||
      !Number.isFinite(pick.latitud) ||
      !Number.isFinite(pick.longitud) ||
      Math.abs(pick.latitud) > 90 ||
      Math.abs(pick.longitud) > 180
    ) {
      pinRef.current?.remove()
      pinRef.current = null
      return
    }
    const lngLat = [pick.longitud, pick.latitud]
    if (!pinRef.current) {
      const el = document.createElement('span')
      el.className = pinClass
      pinRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
      map.jumpTo({ center: lngLat, zoom: Math.max(map.getZoom(), 14) })
    } else {
      pinRef.current.setLngLat(lngLat)
    }
  }, [ready, pick, onPick])

  if (failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-pale-oak/20 p-6 text-center text-small text-muted-foreground',
          className,
        )}
        role="note"
      >
        <MapPinOff className="size-6 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
        <p className="max-w-[36ch]">No se pudo cargar el mapa. Revisa la conexión e inténtalo de nuevo.</p>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-pale-oak/20', className)}>
      {/* El posicionamiento va en un envoltorio: maplibre-gl.css fija `position: relative` en el contenedor del mapa
          y, al no estar en un @layer, le gana a las utilidades de Tailwind (quedaría con 0px de alto). */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="size-full" role="region" aria-label={label} />
      </div>
      {!ready && <div className="absolute inset-0 animate-pulse bg-pale-oak/25" aria-hidden="true" />}
    </div>
  )
}
