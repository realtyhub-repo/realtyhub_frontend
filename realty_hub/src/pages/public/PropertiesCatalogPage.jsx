import { MapPin, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ESTADOS_COMERCIALES, MODALIDADES, TIPOS_PROPIEDAD, listPropiedades } from '@/api/propertyApi'
import { PropertyCard, PropertyCardSkeleton } from '@/components/property/PropertyCard'
import { PublicMessage } from '@/components/public/PublicStates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { ESTADO_LABELS, MODALIDAD_LABELS, TIPO_LABELS, digitsOnly, groupDigits } from '@/lib/property'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

// Solo se ordena por campos que trae la respuesta: un campo inexistente haría fallar la consulta en Spring.
const SORTS = [
  { value: '', label: 'Recomendadas' },
  { value: 'precio,asc', label: 'Precio: menor a mayor' },
  { value: 'precio,desc', label: 'Precio: mayor a menor' },
]

/** Filtros en la URL: una búsqueda se puede compartir, recargar y volver atrás sin perderla. */
function readFilters(params) {
  return {
    modalidad: params.get('modalidad') ?? '',
    tipo: params.get('tipo') ?? '',
    ciudad: params.get('ciudad') ?? '',
    min: digitsOnly(params.get('min')),
    max: digitsOnly(params.get('max')),
    // Por defecto el catálogo muestra solo lo disponible; "todos" incluye vendidas, alquiladas y reservadas.
    estado: params.get('estado') ?? 'DISPONIBLE',
    orden: params.get('orden') ?? '',
    pagina: Math.max(0, Number(params.get('pagina') ?? 1) - 1) || 0,
  }
}

function heading({ modalidad, tipo }) {
  const what = tipo === 'CASA' ? 'Casas' : tipo === 'APARTAMENTO' ? 'Apartamentos' : 'Casas y apartamentos'
  if (modalidad === 'VENTA') return `${what} en venta`
  if (modalidad === 'ALQUILER') return `${what} en alquiler`
  return tipo ? `${what} en venta y alquiler` : 'Propiedades en venta y alquiler'
}

/** Catálogo público (`GET /propiedades`): filtros combinables, orden y paginación. */
export default function PropertiesCatalogPage() {
  const [params, setParams] = useSearchParams()
  const f = readFilters(params)
  const topRef = useRef(null)

  const result = useAsync(
    (signal) =>
      listPropiedades({
        signal,
        modalidad: f.modalidad,
        tipoPropiedad: f.tipo,
        ciudad: f.ciudad.trim(),
        precioMin: f.min,
        precioMax: f.max,
        estadoComercial: f.estado === 'todos' ? '' : f.estado,
        sort: f.orden,
        page: f.pagina,
        size: PAGE_SIZE,
      }),
    [f.modalidad, f.tipo, f.ciudad, f.min, f.max, f.estado, f.orden, f.pagina],
  )

  /** Cambia filtros y vuelve a la primera página (salvo que se cambie la página misma). */
  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v === null || v === undefined || (k === 'estado' && v === 'DISPONIBLE')) next.delete(k)
          else next.set(k, v)
        }
        if (!('pagina' in changes)) next.delete('pagina')
        return next
      },
      { replace: !('pagina' in changes) },
    )
  }

  function goToPage(p) {
    update({ pagina: p > 0 ? String(p + 1) : '' })
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeCount = [f.modalidad, f.tipo, f.ciudad, f.min, f.max, f.estado !== 'DISPONIBLE' ? 'x' : ''].filter(Boolean).length
  const page = result.data?.page
  const items = result.data?.content ?? []
  const total = page?.totalElements ?? 0

  return (
    <>
      <section className="border-b border-ash-grey/40">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-8 sm:pt-16">
          <h1 className="max-w-[30ch] font-display text-hero font-bold leading-[1.1] text-evergreen">{heading(f)}</h1>
          <p className="mt-3 max-w-[60ch] text-muted-foreground sm:text-subtitle sm:leading-snug">
            Recorre cada propiedad con sus fotos, características y ubicación, y conoce al agente que la acompaña.
          </p>
        </div>
      </section>

      <FilterBar filters={f} onChange={update} activeCount={activeCount} />

      <section ref={topRef} aria-label="Resultados" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-10 sm:px-8 lg:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-small text-muted-foreground" aria-live="polite">
            {result.loading ? (
              'Buscando propiedades'
            ) : result.error ? null : (
              <>
                <span className="font-display text-subtitle font-semibold text-evergreen tabular-nums">{total}</span>{' '}
                {total === 1 ? 'propiedad' : 'propiedades'}
              </>
            )}
          </p>
          <label className="flex items-center gap-3 text-small text-muted-foreground">
            Ordenar por
            <Select value={f.orden} onChange={(e) => update({ orden: e.target.value })} className="w-56">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {result.error ? (
          <PublicMessage title="No pudimos cargar las propiedades" text={result.error.mensaje} onRetry={result.reload} back={null} />
        ) : result.loading && !result.data ? (
          <Grid>
            {Array.from({ length: 6 }, (_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </Grid>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-ash-grey px-6 py-12 sm:px-10">
            <SearchX className="size-6 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-evergreen">No hay propiedades con estos filtros</p>
              <p className="max-w-[60ch] text-small text-muted-foreground">
                Prueba con otra ciudad, amplía el rango de precio o incluye las propiedades ya reservadas.
              </p>
            </div>
            {activeCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>
                Quitar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <Grid className={cn('transition-opacity duration-200', result.loading && 'opacity-50')}>
              {items.map((p, i) => (
                <PropertyCard key={p.id} propiedad={p} priority={i < 3} />
              ))}
            </Grid>
            <Pagination page={page?.number ?? 0} totalPages={page?.totalPages ?? 0} onChange={goToPage} className="mt-14" />
          </>
        )}
      </section>
    </>
  )
}

function Grid({ className, children }) {
  return <div className={cn('grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</div>
}

const chip = (active) =>
  cn(
    'h-10 rounded-full px-4 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-evergreen text-floral-white' : 'text-evergreen hover:bg-pale-oak/30',
  )

/**
 * Barra de filtros fija bajo la cabecera. La modalidad es un selector segmentado (la decisión principal);
 * el resto se agrupa en una fila que en móvil se despliega con "Filtros".
 */
function FilterBar({ filters: f, onChange, activeCount }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-16 z-20 border-b border-ash-grey/40 bg-floral-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <div role="group" aria-label="Modalidad" className="flex shrink-0 rounded-full border border-ash-grey/70 p-0.5">
            {['', ...MODALIDADES].map((m) => (
              <button key={m || 'todas'} type="button" aria-pressed={f.modalidad === m} onClick={() => onChange({ modalidad: m })} className={chip(f.modalidad === m)}>
                {m ? MODALIDAD_LABELS[m] : 'Todas'}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-11 lg:hidden"
            aria-expanded={open}
            aria-controls="filtros-avanzados"
            onClick={() => setOpen((v) => !v)}
          >
            <SlidersHorizontal strokeWidth={1.75} aria-hidden="true" />
            Filtros
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-evergreen text-meta text-floral-white">{activeCount}</span>
            )}
          </Button>

          <div className="hidden flex-1 lg:block">
            <AdvancedFilters filters={f} onChange={onChange} activeCount={activeCount} />
          </div>
        </div>
        {open && (
          <div id="filtros-avanzados" className="pb-2 pt-4 lg:hidden">
            <AdvancedFilters filters={f} onChange={onChange} activeCount={activeCount} stacked />
          </div>
        )}
      </div>
    </div>
  )
}

function AdvancedFilters({ filters: f, onChange, activeCount, stacked = false }) {
  return (
    <div
      className={cn(
        'grid gap-3',
        stacked ? 'sm:grid-cols-2' : 'grid-cols-[minmax(176px,1fr)_minmax(150px,1.2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(176px,1fr)_auto] items-center',
      )}
    >
      <Select aria-label="Tipo de propiedad" value={f.tipo} onChange={(e) => onChange({ tipo: e.target.value })}>
        <option value="">Todos los tipos</option>
        {TIPOS_PROPIEDAD.map((t) => (
          <option key={t} value={t}>
            {TIPO_LABELS[t]}
          </option>
        ))}
      </Select>
      <CityInput value={f.ciudad} onCommit={(ciudad) => onChange({ ciudad })} />
      <PriceInput label="Precio mínimo" value={f.min} onCommit={(min) => onChange({ min })} />
      <PriceInput label="Precio máximo" value={f.max} onCommit={(max) => onChange({ max })} />
      <Select aria-label="Estado" value={f.estado} onChange={(e) => onChange({ estado: e.target.value })}>
        <option value="DISPONIBLE">Solo disponibles</option>
        {ESTADOS_COMERCIALES.filter((e) => e !== 'DISPONIBLE').map((e) => (
          <option key={e} value={e}>
            {ESTADO_LABELS[e]}s
          </option>
        ))}
        <option value="todos">Todos los estados</option>
      </Select>
      {activeCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-11 justify-self-start"
          onClick={() => onChange({ modalidad: '', tipo: '', ciudad: '', min: '', max: '', estado: '' })}
        >
          <X strokeWidth={1.75} aria-hidden="true" />
          Limpiar
        </Button>
      ) : (
        !stacked && <span className="w-[86px]" aria-hidden="true" />
      )}
    </div>
  )
}

/** Campo de texto que aplica el filtro al dejar de escribir (o con Enter), no en cada tecla. */
function useCommittedValue(value, onCommit, delay = 500) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  // Si la URL cambia desde fuera (limpiar filtros, volver atrás), el borrador se alinea.
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }
  useEffect(() => {
    if (draft === value) return
    const id = setTimeout(() => onCommit(draft), delay)
    return () => clearTimeout(id)
  }, [draft, value, onCommit, delay])
  return [draft, setDraft, () => draft !== value && onCommit(draft)]
}

function CityInput({ value, onCommit }) {
  const [draft, setDraft, flush] = useCommittedValue(value, onCommit)
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
      <Input
        aria-label="Ciudad"
        placeholder="Ciudad"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && flush()}
        onBlur={flush}
        className="pl-9"
      />
    </div>
  )
}

function PriceInput({ label, value, onCommit }) {
  const [draft, setDraft, flush] = useCommittedValue(value, onCommit, 700)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-small text-ash-grey" aria-hidden="true">
        $
      </span>
      <Input
        aria-label={label}
        placeholder={label}
        inputMode="numeric"
        value={groupDigits(draft)}
        onChange={(e) => setDraft(digitsOnly(e.target.value).slice(0, 13))}
        onKeyDown={(e) => e.key === 'Enter' && flush()}
        onBlur={flush}
        className="pl-7 tabular-nums"
      />
    </div>
  )
}
