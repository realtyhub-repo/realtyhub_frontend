import { ChevronRight, House, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ESTADOS_COMERCIALES, MODALIDADES, TIPOS_PROPIEDAD, listPropiedades } from '@/api/propertyApi'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { StatusBadge } from '@/components/property/StatusBadge'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { ESTADO_LABELS, MODALIDAD_LABELS, TIPO_LABELS, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

/**
 * Inventario de propiedades en el panel (`GET /propiedades`). No existe un listado de "mis propiedades"
 * (docs §6 y §7): se ve el inventario completo y cada ficha indica si se puede editar.
 */
export default function PropertiesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const f = {
    estado: params.get('estado') ?? '',
    modalidad: params.get('modalidad') ?? '',
    tipo: params.get('tipo') ?? '',
    ciudad: params.get('ciudad') ?? '',
    pagina: Math.max(0, Number(params.get('pagina') ?? 1) - 1) || 0,
  }

  const result = useAsync(
    (signal) =>
      listPropiedades({
        signal,
        estadoComercial: f.estado,
        modalidad: f.modalidad,
        tipoPropiedad: f.tipo,
        ciudad: f.ciudad.trim(),
        page: f.pagina,
        size: PAGE_SIZE,
      }),
    [f.estado, f.modalidad, f.tipo, f.ciudad, f.pagina],
  )

  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        if (!('pagina' in changes)) next.delete('pagina')
        return next
      },
      { replace: true },
    )
  }

  const items = result.data?.content ?? []
  const page = result.data?.page
  const filtered = !!(f.estado || f.modalidad || f.tipo || f.ciudad)

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        title="Propiedades"
        description="Inventario de todo el equipo. Solo el agente a cargo de cada propiedad o un administrador central puede editarla."
        actions={
          <Link to="/panel/propiedades/nueva" className={buttonVariants()}>
            <Plus strokeWidth={1.75} aria-hidden="true" />
            Publicar propiedad
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <CitySearch value={f.ciudad} onCommit={(ciudad) => update({ ciudad })} />
        <Select aria-label="Estado" value={f.estado} onChange={(e) => update({ estado: e.target.value })}>
          <option value="">Todos los estados</option>
          {ESTADOS_COMERCIALES.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABELS[e]}
            </option>
          ))}
        </Select>
        <Select aria-label="Modalidad" value={f.modalidad} onChange={(e) => update({ modalidad: e.target.value })}>
          <option value="">Venta y alquiler</option>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>
              {MODALIDAD_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select aria-label="Tipo" value={f.tipo} onChange={(e) => update({ tipo: e.target.value })}>
          <option value="">Casas y apartamentos</option>
          {TIPOS_PROPIEDAD.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      {result.error ? (
        <LoadError error={result.error} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <ListSkeleton rows={6} />
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState icon={Search} title="Ninguna propiedad coincide con los filtros" text="Prueba con otra ciudad o quita alguno de los filtros." />
        ) : (
          <EmptyState
            icon={House}
            title="Aún no hay propiedades publicadas"
            text="Publica la primera con sus datos, características y ubicación; después podrás agregar las fotos."
            action={
              <Link to="/panel/propiedades/nueva" className={buttonVariants({ size: 'sm' })}>
                Publicar propiedad
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className={cn('overflow-hidden rounded-card border border-ash-grey/60 transition-opacity duration-200', result.loading && 'opacity-60')}>
            <table className="w-full text-left text-small">
              <thead className="border-b border-ash-grey/60 bg-pale-oak/15 text-meta text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Propiedad</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Tipo</th>
                  <th scope="col" className="hidden px-5 py-3 text-right font-medium sm:table-cell">Precio</th>
                  <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                  <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-grey/40">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/panel/propiedades/${p.id}`)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-pale-oak/10"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        <PropertyPhoto src={p.urlPortada} alt="" label="" className="aspect-[4/3] w-16 shrink-0 rounded-control sm:w-20" />
                        <div className="min-w-0">
                          <Link
                            to={`/panel/propiedades/${p.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="line-clamp-2 font-medium text-evergreen sm:line-clamp-1 focus-visible:underline focus-visible:outline-none"
                          >
                            {p.titulo}
                          </Link>
                          <p className="text-muted-foreground">{p.ciudad}</p>
                          <p className="font-medium tabular-nums text-evergreen sm:hidden">{formatPrice(p.precio)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                      {TIPO_LABELS[p.tipoPropiedad]} · {MODALIDAD_LABELS[p.modalidad]?.toLowerCase()}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-evergreen sm:table-cell">
                      {formatPrice(p.precio)}
                      {p.modalidad === 'ALQUILER' && <span className="font-normal text-muted-foreground"> /mes</span>}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge estado={p.estadoComercial} />
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="size-4 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-small text-muted-foreground tabular-nums">
              {page?.totalElements ?? items.length} {page?.totalElements === 1 ? 'propiedad' : 'propiedades'}
            </p>
            <Pagination page={page?.number ?? 0} totalPages={page?.totalPages ?? 0} onChange={(p) => update({ pagina: p > 0 ? String(p + 1) : '' })} />
          </div>
        </>
      )}
    </div>
  )
}

/** Búsqueda por ciudad que filtra al dejar de escribir. */
function CitySearch({ value, onCommit }) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }
  useEffect(() => {
    if (draft === value) return
    const id = setTimeout(() => onCommit(draft), 450)
    return () => clearTimeout(id)
  }, [draft, value, onCommit])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
      <Input aria-label="Filtrar por ciudad" placeholder="Filtrar por ciudad" value={draft} onChange={(e) => setDraft(e.target.value)} className="pl-9" />
    </div>
  )
}
