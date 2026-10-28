import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MODES = [
  { value: 'VENTA', label: 'Comprar' },
  { value: 'ALQUILER', label: 'Alquilar' },
]

/** Búsqueda del hero: lleva al catálogo con `modalidad` y `ciudad` ya aplicados en la URL. */
export function HeroSearch() {
  const navigate = useNavigate()
  const [modalidad, setModalidad] = useState('VENTA')
  const [ciudad, setCiudad] = useState('')

  function submit(e) {
    e.preventDefault()
    const params = new URLSearchParams({ modalidad })
    if (ciudad.trim()) params.set('ciudad', ciudad.trim())
    navigate(`/propiedades?${params}`)
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar propiedades" className="w-full max-w-[34rem] space-y-3">
      <div role="radiogroup" aria-label="Qué quieres hacer" className="inline-flex rounded-control bg-pale-oak/35 p-1">
        {MODES.map((m) => {
          const active = modalidad === m.value
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setModalidad(m.value)}
              className={cn(
                'h-9 rounded-[4px] px-5 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-floral-white',
                active ? 'bg-evergreen text-floral-white' : 'text-evergreen hover:bg-pale-oak/50',
              )}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Input
            name="ciudad"
            aria-label="Ciudad"
            autoComplete="off"
            placeholder="Ciudad, por ejemplo Bogotá"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className="h-12 pl-9"
          />
        </div>
        <Button type="submit" size="lg">
          <Search strokeWidth={1.75} aria-hidden="true" />
          Buscar propiedades
        </Button>
      </div>
    </form>
  )
}
