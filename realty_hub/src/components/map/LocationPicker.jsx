import { MousePointerClick } from 'lucide-react'
import { useState } from 'react'
import { OfficeMap } from '@/components/map/OfficeMap'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Selector de coordenadas: un clic en el mapa coloca el pin y entrega { latitud, longitud }.
 * Las coordenadas también se pueden escribir a mano; si el mapa no puede cargar, quedan solo los campos.
 * Ojo con el orden: MapLibre trabaja en [lng, lat]; el API usa campos con nombre (docs/property-service.md §4.5).
 */
export function LocationPicker({ coords, onPick, error, label = 'Selector de ubicación', hint = 'Haz clic en el mapa para marcar la ubicación.', className }) {
  const [mapUnavailable, setMapUnavailable] = useState(false)

  return (
    <div className="space-y-2">
      <OfficeMap
        pick={coords}
        onPick={onPick}
        onUnavailable={() => setMapUnavailable(true)}
        className={cn('h-72 rounded-card border border-ash-grey/60 md:h-80', className)}
        label={label}
      />
      {!mapUnavailable && (
        <p className={cn('flex items-center gap-2 text-small', error ? 'text-error' : 'text-muted-foreground')}>
          <MousePointerClick className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {error ?? `${hint} También puedes escribir las coordenadas o pegar las de Google Maps.`}
        </p>
      )}
      <ManualCoords coords={coords} onChange={onPick} error={mapUnavailable ? error : undefined} invalid={Boolean(error)} />
    </div>
  )
}

// Lo que copia Google Maps al hacer clic derecho en un punto: "8.747943123456, -75.881404123456".
const PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

/** Texto del campo → número. Acepta coma decimal; vacío o incompleto ("-", "8.") cuenta como sin valor. */
function parseCoord(text) {
  const t = text.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}

const showCoord = (n) => (Number.isFinite(n) ? String(n) : '')

/**
 * Entrada manual de coordenadas. Son campos de texto (no `type="number"`) para poder pegar el par
 * "latitud, longitud" de Google Maps en cualquiera de los dos y para no depender de cómo cada
 * navegador interpreta el punto decimal según el idioma.
 */
function ManualCoords({ coords, onChange, error, invalid }) {
  const [draft, setDraft] = useState(() => ({ latitud: showCoord(coords?.latitud), longitud: showCoord(coords?.longitud) }))
  const [prevCoords, setPrevCoords] = useState(coords)
  // Si las coordenadas cambian desde fuera (clic en el mapa), reflejarlas sin pisar lo que se está escribiendo.
  if (coords !== prevCoords) {
    setPrevCoords(coords)
    setDraft((d) => ({
      latitud: Object.is(parseCoord(d.latitud), coords?.latitud ?? NaN) ? d.latitud : showCoord(coords?.latitud),
      longitud: Object.is(parseCoord(d.longitud), coords?.longitud ?? NaN) ? d.longitud : showCoord(coords?.longitud),
    }))
  }

  const set = (key) => (e) => {
    const next = { ...draft, [key]: e.target.value }
    setDraft(next)
    onChange({ latitud: parseCoord(next.latitud), longitud: parseCoord(next.longitud) })
  }

  function paste(e) {
    const text = e.clipboardData.getData('text')
    const m = PAIR.exec(text)
    // "8,747943" sin espacio ni punto es un solo número con coma decimal, no un par.
    if (!m || !(/,\s/.test(text) || m[1].includes('.'))) return
    e.preventDefault()
    // Mismo redondeo que el clic en el mapa: 6 decimales (~10 cm) sobran para ubicar un inmueble.
    const latitud = Number(Number(m[1]).toFixed(6))
    const longitud = Number(Number(m[2]).toFixed(6))
    setDraft({ latitud: showCoord(latitud), longitud: showCoord(longitud) })
    onChange({ latitud, longitud })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" autoComplete="off" aria-label="Latitud" placeholder="Latitud" value={draft.latitud} onChange={set('latitud')} onPaste={paste} aria-invalid={invalid || undefined} />
        <Input inputMode="decimal" autoComplete="off" aria-label="Longitud" placeholder="Longitud" value={draft.longitud} onChange={set('longitud')} onPaste={paste} aria-invalid={invalid || undefined} />
      </div>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  )
}
