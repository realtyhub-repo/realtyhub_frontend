import { ChevronLeft, MapPin, Navigation } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { getOficina, listAgentesDeOficina, listSucursales } from '@/api/userApi'
import { OfficeMap } from '@/components/map/OfficeMap'
import { PublicError } from '@/components/public/PublicStates'
import { buttonVariants } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { initials } from '@/lib/format'

const byName = (key) => (a, b) => (a[key] ?? '').localeCompare(b[key] ?? '', 'es')

/** Ficha pública de una oficina: ubicación, equipo y su red (sucursales o central). */
export default function OfficeDetailPage() {
  const { id } = useParams()

  const data = useAsync(
    async (signal) => {
      const oficina = await getOficina(id, { signal })
      const [agentes, sucursales, central] = await Promise.all([
        listAgentesDeOficina(id, { signal }),
        oficina.tipo === 'CENTRAL' ? listSucursales(id, { signal }) : [],
        oficina.oficinaCentralId ? getOficina(oficina.oficinaCentralId, { signal }).catch(() => null) : null,
      ])
      return { oficina, agentes: [...agentes].sort(byName('nombreUsuario')), sucursales: [...sucursales].sort(byName('nombre')), central }
    },
    [id],
  )

  const mapOffices = useMemo(
    () => (data.data ? [data.data.oficina, ...data.data.sucursales] : []),
    [data.data],
  )

  if (data.error) return <PublicError error={data.error} notFoundTitle="No encontramos esta oficina" onRetry={data.reload} />
  if (data.loading) return <DetailSkeleton />

  const { oficina, agentes, sucursales, central } = data.data
  const directions = `https://www.google.com/maps/search/?api=1&query=${oficina.latitud},${oficina.longitud}`

  return (
    <article>
      <header className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-10">
        <Link
          to="/oficinas"
          className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Todas las oficinas
        </Link>
        <div className="mt-6 flex flex-col gap-6 pb-10 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-hero font-bold leading-[1.1] text-evergreen">{oficina.nombre}</h1>
            <p className="flex items-center gap-2 text-subtitle text-muted-foreground">
              <MapPin className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {oficina.region}
              <span className="text-ash-grey" aria-hidden="true">·</span>
              {oficina.tipo === 'CENTRAL' ? 'Oficina central' : 'Sucursal'}
            </p>
          </div>
          <a href={directions} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline' })}>
            <Navigation strokeWidth={1.75} aria-hidden="true" />
            Cómo llegar
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <OfficeMap
          offices={mapOffices}
          activeId={oficina.id}
          focusId={null}
          zoom={15}
          label={`Ubicación de ${oficina.nombre}`}
          className="h-[44svh] min-h-80 rounded-card border border-ash-grey/50"
        />
      </div>

      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
        <section aria-labelledby="equipo">
          <h2 id="equipo" className="text-section leading-tight text-evergreen">
            Equipo
          </h2>
          {agentes.length === 0 ? (
            <p className="mt-4 max-w-[60ch] text-muted-foreground">
              Esta oficina todavía no tiene agentes publicados.
            </p>
          ) : (
            <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {agentes.map((a) => (
                <li key={a.id}>
                  <Link to={`/agentes/${a.usuarioId}`} className="group flex items-center gap-4 focus-visible:outline-none">
                    <span
                      className="flex size-16 shrink-0 items-center justify-center rounded-full bg-pale-oak/60 font-display text-subtitle font-semibold text-evergreen transition-colors duration-200 group-hover:bg-evergreen group-hover:text-floral-white group-focus-visible:ring-2 group-focus-visible:ring-ring"
                      aria-hidden="true"
                    >
                      {initials(a.nombreUsuario)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-subtitle font-semibold leading-tight text-evergreen">
                        {a.nombreUsuario}
                      </span>
                      <span className="mt-1 block truncate text-small text-muted-foreground">
                        {a.zonaEspecialidad || 'Agente inmobiliario'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-10">
          {oficina.tipo === 'CENTRAL' ? (
            <section aria-labelledby="red">
              <h2 id="red" className="text-subtitle leading-tight text-evergreen">
                Sucursales
              </h2>
              {sucursales.length === 0 ? (
                <p className="mt-3 text-small text-muted-foreground">Esta central atiende sin sucursales por ahora.</p>
              ) : (
                <ul className="mt-4 divide-y divide-ash-grey/50 border-y border-ash-grey/50">
                  {sucursales.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/oficinas/${s.id}`}
                        className="flex items-baseline justify-between gap-4 py-3 transition-colors duration-150 hover:text-emerald-depths"
                      >
                        <span className="font-medium text-evergreen">{s.nombre}</span>
                        <span className="text-small text-muted-foreground">{s.region}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            central && (
              <section aria-labelledby="red" className="rounded-card bg-pale-oak/25 p-6">
                <h2 id="red" className="text-small font-medium text-muted-foreground">
                  Forma parte de
                </h2>
                <Link
                  to={`/oficinas/${central.id}`}
                  className="mt-2 block font-display text-subtitle font-semibold text-evergreen transition-colors duration-150 hover:text-emerald-depths"
                >
                  {central.nombre}
                </Link>
                <p className="text-small text-muted-foreground">{central.region}</p>
              </section>
            )
          )}
        </aside>
      </div>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-8" role="status" aria-label="Cargando oficina">
      <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
      <span className="block h-10 w-2/3 max-w-lg animate-pulse rounded-full bg-pale-oak/40" />
      <span className="block h-5 w-40 animate-pulse rounded-full bg-pale-oak/30" />
      <span className="block h-[44svh] animate-pulse rounded-card bg-pale-oak/25" />
    </div>
  )
}
