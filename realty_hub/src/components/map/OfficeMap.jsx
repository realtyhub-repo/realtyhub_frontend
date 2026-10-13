import { MapPinOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MAPBOX_TOKEN } from '@/lib/mapbox'
import { cn } from '@/lib/utils'


// Sin oficinas ni pin todavía: vista amplia de partida (los ejemplos del backend están en Lima).
const DEFAULT_CENTER = [-77.042793, -12.046374]
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11'

const markerBase =
  'block size-4 cursor-pointer rounded-full border-2 border-floral-white bg-evergreen shadow-[0_1px_4px_rgb(10_59_53/0.45)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:scale-125 data-[active=true]:scale-150 data-[active=true]:bg-emerald-depths data-[active=true]:shadow-[0_0_0_6px_rgb(216_194_164/0.55)] data-[tipo=CENTRAL]:size-5'

const pinClass =
  'block size-6 rounded-full border-[3px] border-floral-white bg-evergreen shadow-[0_0_0_8px_rgb(42_97_81/0.18),0_2px_6px_rgb(10_59_53/0.4)]'

/** Carga mapbox-gl solo cuando hace falta un mapa: es pesado y casi ninguna pantalla lo usa. */
let mapboxPromise
function loadMapbox() {
  mapboxPromise ??= Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]).then(([m]) => {
    const mapboxgl = m.default
    mapboxgl.accessToken = MAPBOX_TOKEN
    return mapboxgl
  })
  return mapboxPromise
}

/**
 * Mapa de oficinas (Mapbox, docs/user-service.md §4.4).
 * - `offices`: marcadores { id, nombre, latitud, longitud, tipo }. `activeId` resalta uno; `focusId`
 *   (por defecto el mismo) centra el mapa en él. Separarlos permite resaltar al pasar el cursor sin mover el mapa.
 * - `onSelect(id)`: clic en un marcador.
 * - `pick` + `onPick({ latitud, longitud })`: modo selector; un clic coloca el pin y entrega las coordenadas.
 */
export function OfficeMap({ offices = [], activeId, focusId = activeId, onSelect, pick, onPick, zoom = 13, className, label = 'Mapa de oficinas' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const pinRef = useRef(null)
  const callbacks = useRef({ onSelect, onPick })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    callbacks.current = { onSelect, onPick }
  })

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return
    const markers = markersRef.current
    let cancelled = false
    let map
    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 11,
          attributionControl: true,
          cooperativeGestures: !onPick,
        })
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        map.on('click', (e) => {
          callbacks.current.onPick?.({
            latitud: Number(e.lngLat.lat.toFixed(6)),
            longitud: Number(e.lngLat.lng.toFixed(6)),
          })
        })
        if (onPick) map.getCanvas().style.cursor = 'crosshair'
        map.on('load', () => !cancelled && setReady(true))
        map.on('error', (e) => {
          // 401 del token o estilo inaccesible: mostrar el aviso en vez de un mapa gris.
          if (e?.error?.status === 401 || e?.error?.status === 403) setFailed(true)
        })
        mapRef.current = { map, mapboxgl }
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
    const { map, mapboxgl } = mapRef.current
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
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        callbacks.current.onSelect?.(o.id)
      })
      markers.set(o.id, new mapboxgl.Marker({ element: el }).setLngLat([o.longitud, o.latitud]).addTo(map))
    }

    if (valid.length === 1) {
      map.jumpTo({ center: [valid[0].longitud, valid[0].latitud], zoom })
    } else if (valid.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
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
    const { map, mapboxgl } = mapRef.current
    if (!pick || !Number.isFinite(pick.latitud) || !Number.isFinite(pick.longitud)) {
      pinRef.current?.remove()
      pinRef.current = null
      return
    }
    const lngLat = [pick.longitud, pick.latitud]
    if (!pinRef.current) {
      const el = document.createElement('span')
      el.className = pinClass
      pinRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
      map.jumpTo({ center: lngLat, zoom: Math.max(map.getZoom(), 14) })
    } else {
      pinRef.current.setLngLat(lngLat)
    }
  }, [ready, pick, onPick])

  if (!MAPBOX_TOKEN || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-pale-oak/20 p-6 text-center text-small text-muted-foreground',
          className,
        )}
        role="note"
      >
        <MapPinOff className="size-6 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
        <p className="max-w-[36ch]">
          {failed
            ? 'No pudimos cargar el mapa. Revisa la conexión o el token de Mapbox.'
            : 'El mapa no está disponible: falta configurar VITE_MAPBOX_TOKEN.'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-pale-oak/20', className)}>
      <div ref={containerRef} className="absolute inset-0" role="region" aria-label={label} />
      {!ready && <div className="absolute inset-0 animate-pulse bg-pale-oak/25" aria-hidden="true" />}
    </div>
  )
}
