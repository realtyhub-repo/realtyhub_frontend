import { MousePointerClick } from 'lucide-react'
import { useState } from 'react'
import { OfficeMap } from '@/components/map/OfficeMap'
import { Input } from '@/components/ui/input'
import { formatCoord } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Selector de coordenadas: un clic en el mapa coloca el pin y entrega { latitud, longitud }.
 * Si el mapa no puede cargar, cae a dos campos numéricos para no bloquear la operación.
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
      {!mapUnavailable ? (
        <p className={cn('flex items-center gap-2 text-small', error ? 'text-error' : 'text-muted-foreground')}>
          <MousePointerClick className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {error ?? (coords && Number.isFinite(coords.latitud) ? `${formatCoord(coords.latitud)}, ${formatCoord(coords.longitud)}` : hint)}
        </p>
      ) : (
        <ManualCoords coords={coords} onChange={onPick} error={error} />
      )}
    </div>
  )
}

/** Si el mapa no carga: entrada manual de coordenadas. */
function ManualCoords({ coords, onChange, error }) {
  const set = (key) => (e) => {
    const n = e.target.value === '' ? NaN : Number(e.target.value)
    onChange({ latitud: coords?.latitud ?? NaN, longitud: coords?.longitud ?? NaN, [key]: n })
  }
  const val = (n) => (Number.isFinite(n) ? n : '')
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" step="any" min={-90} max={90} aria-label="Latitud" placeholder="Latitud" value={val(coords?.latitud)} onChange={set('latitud')} aria-invalid={error ? true : undefined} />
        <Input type="number" step="any" min={-180} max={180} aria-label="Longitud" placeholder="Longitud" value={val(coords?.longitud)} onChange={set('longitud')} aria-invalid={error ? true : undefined} />
      </div>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  )
}
