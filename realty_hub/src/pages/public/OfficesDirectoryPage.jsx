import { MapPin } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { listOficinas } from '@/api/userApi'
import { OfficeMap } from '@/components/map/OfficeMap'
import { PublicError } from '@/components/public/PublicStates'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'

const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

/** Directorio público de oficinas con mapa (`GET /oficinas`). */
export default function OfficesDirectoryPage() {
  const oficinas = useAsync((signal) => listOficinas({ signal }), [])
  const [region, setRegion] = useState('')
  const [hoverId, setHoverId] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const itemRefs = useRef(new Map())

  const all = useMemo(() => [...(oficinas.data ?? [])].sort(byName), [oficinas.data])
  const regions = useMemo(() => [...new Set(all.map((o) => o.region))].sort((a, b) => a.localeCompare(b, 'es')), [all])
  const visible = useMemo(() => (region ? all.filter((o) => o.region === region) : all), [all, region])
  const sucursalCount = useMemo(() => {
    const counts = new Map()
    all.forEach((o) => o.oficinaCentralId && counts.set(o.oficinaCentralId, (counts.get(o.oficinaCentralId) ?? 0) + 1))
    return counts
  }, [all])
  const centralName = (id) => all.find((o) => o.id === id)?.nombre

  function selectFromMap(id) {
    setFocusId(id)
    itemRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  if (oficinas.error) return <PublicError error={oficinas.error} onRetry={oficinas.reload} />

  return (
    <>
      <section className="border-b border-ash-grey/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8 sm:py-20">
          <h1 className="font-display text-hero font-bold leading-[1.15] text-evergreen">Encuentra una oficina cerca de ti</h1>
          <p className="mx-auto mt-4 max-w-[60ch] text-body text-muted-foreground sm:text-subtitle sm:leading-snug">
            Cada oficina reúne agentes que conocen su zona a fondo. Visítanos o conoce al equipo antes de tu próxima mudanza.
          </p>
          {oficinas.data && (
            <p className="mt-8 inline-flex items-center gap-3 text-small text-muted-foreground">
              <span>
                <span className="font-display text-subtitle font-semibold text-evergreen">{all.length}</span>{' '}
                {all.length === 1 ? 'oficina' : 'oficinas'}
              </span>
              <span className="h-4 w-px bg-ash-grey" aria-hidden="true" />
              <span>
                <span className="font-display text-subtitle font-semibold text-evergreen">{regions.length}</span>{' '}
                {regions.length === 1 ? 'región' : 'regiones'}
              </span>
            </p>
          )}
        </div>
      </section>

      <section aria-label="Oficinas" className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:py-12">
        {regions.length > 1 && (
          <div role="group" aria-label="Filtrar por región" className="mb-8 flex flex-wrap gap-2">
            {['', ...regions].map((r) => (
              <button
                key={r || 'todas'}
                type="button"
                onClick={() => setRegion(r)}
                aria-pressed={region === r}
                className={cn(
                  'h-9 rounded-full border px-4 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  region === r
                    ? 'border-evergreen bg-evergreen text-floral-white'
                    : 'border-ash-grey text-evergreen hover:border-evergreen hover:bg-pale-oak/25',
                )}
              >
                {r || 'Todas'}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="order-2 lg:order-1">
            {oficinas.loading ? (
              <ul className="space-y-3" aria-label="Cargando oficinas">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="h-28 animate-pulse rounded-card bg-pale-oak/25" />
                ))}
              </ul>
            ) : visible.length === 0 ? (
              <p className="rounded-card border border-dashed border-ash-grey px-6 py-10 text-muted-foreground">
                Aún no hay oficinas publicadas.
              </p>
            ) : (
              <ul className="space-y-3">
                {visible.map((o) => {
                  const subs = sucursalCount.get(o.id) ?? 0
                  const active = hoverId === o.id || focusId === o.id
                  return (
                    <li key={o.id} ref={(el) => (el ? itemRefs.current.set(o.id, el) : itemRefs.current.delete(o.id))}>
                      <div
                        onMouseEnter={() => setHoverId(o.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={cn(
                          'group relative rounded-card border p-5 transition-[border-color,background-color] duration-200',
                          active ? 'border-evergreen/60 bg-pale-oak/20' : 'border-ash-grey/60 hover:border-evergreen/40',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setFocusId(o.id)}
                          aria-label={`Ver ${o.nombre} en el mapa`}
                          className="absolute inset-0 cursor-pointer rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h2 className="font-display text-subtitle font-semibold leading-tight text-evergreen">{o.nombre}</h2>
                            <p className="mt-1 flex items-center gap-1.5 text-small text-muted-foreground">
                              <MapPin className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                              {o.region}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2.5 py-0.5 text-meta font-medium',
                              o.tipo === 'CENTRAL' ? 'bg-evergreen text-floral-white' : 'bg-pale-oak/50 text-evergreen',
                            )}
                          >
                            {o.tipo === 'CENTRAL' ? 'Central' : 'Sucursal'}
                          </span>
                        </div>
                        <p className="mt-4 border-t border-ash-grey/40 pt-3 text-small text-muted-foreground">
                          {o.tipo === 'CENTRAL'
                            ? subs
                              ? `${subs} ${subs === 1 ? 'sucursal' : 'sucursales'} en su red`
                              : 'Oficina central'
                            : `Parte de ${centralName(o.oficinaCentralId) ?? 'una oficina central'}`}
                          <Link
                            to={`/oficinas/${o.id}`}
                            className="relative float-right rounded-sm font-medium text-emerald-depths transition-colors duration-150 group-hover:text-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Ver oficina
                          </Link>
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <OfficeMap
              offices={visible}
              activeId={hoverId ?? focusId}
              focusId={focusId}
              onSelect={selectFromMap}
              className="h-[52svh] rounded-card border border-ash-grey/50 lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)]"
            />
          </div>
        </div>
      </section>
    </>
  )
}
