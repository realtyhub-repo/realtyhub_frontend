import { Building, ChevronLeft, MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { getAgente, getOficina } from '@/api/userApi'
import { OfficeMap } from '@/components/map/OfficeMap'
import { PublicError } from '@/components/public/PublicStates'
import { buttonVariants } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { initials } from '@/lib/format'

/**
 * Ficha pública de un agente (`GET /agentes/{id}`, id del registro de agente). Solo nombre, oficina y zona:
 * el contacto no es público (docs/user-service.md §4.6).
 */
export default function AgentProfilePage() {
  const { id } = useParams()

  const data = useAsync(
    async (signal) => {
      const agente = await getAgente(id, { signal })
      const oficina = await getOficina(agente.oficinaId, { signal }).catch(() => null)
      return { agente, oficina }
    },
    [id],
  )

  const mapOffices = useMemo(() => (data.data?.oficina ? [data.data.oficina] : []), [data.data])

  if (data.error) return <PublicError error={data.error} notFoundTitle="No encontramos a este agente" onRetry={data.reload} />
  if (data.loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-[280px_minmax(0,1fr)]" role="status" aria-label="Cargando agente">
        <span className="aspect-square animate-pulse rounded-card bg-pale-oak/30" />
        <div className="space-y-4">
          <span className="block h-10 w-2/3 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="block h-5 w-1/3 animate-pulse rounded-full bg-pale-oak/30" />
        </div>
      </div>
    )
  }

  const { agente, oficina } = data.data

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        to={oficina ? `/oficinas/${oficina.id}` : '/oficinas'}
        className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {oficina ? oficina.nombre : 'Oficinas'}
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[280px_minmax(0,1fr)] md:gap-14">
        {/* Monograma: la API pública no expone foto del agente. */}
        <div
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card bg-evergreen text-pale-oak"
          aria-hidden="true"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(var(--floral-white) 1px, transparent 1px), linear-gradient(90deg, var(--floral-white) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <span className="relative font-display text-[96px] font-semibold leading-none tracking-tight">
            {initials(agente.nombreUsuario)}
          </span>
        </div>

        <div className="flex flex-col">
          <h1 className="font-display text-hero font-bold leading-[1.1] text-evergreen">{agente.nombreUsuario}</h1>
          <p className="mt-3 text-subtitle text-muted-foreground">Agente inmobiliario</p>

          <dl className="mt-10 grid gap-6 border-t border-ash-grey/50 pt-8 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-small text-muted-foreground">
                <Building className="size-4" strokeWidth={1.5} aria-hidden="true" />
                Oficina
              </dt>
              <dd className="mt-2">
                <Link
                  to={`/oficinas/${agente.oficinaId}`}
                  className="font-display text-subtitle font-semibold text-evergreen transition-colors duration-150 hover:text-emerald-depths"
                >
                  {agente.nombreOficina}
                </Link>
                {oficina && <p className="text-small text-muted-foreground">{oficina.region}</p>}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-small text-muted-foreground">
                <MapPin className="size-4" strokeWidth={1.5} aria-hidden="true" />
                Zona de especialidad
              </dt>
              <dd className="mt-2 font-display text-subtitle font-semibold text-evergreen">
                {agente.zonaEspecialidad || 'Toda la zona de su oficina'}
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <Link to={`/oficinas/${agente.oficinaId}`} className={buttonVariants()}>
              Visitar la oficina
            </Link>
          </div>
        </div>
      </div>

      {oficina && (
        <section aria-labelledby="ubicacion" className="mt-16">
          <h2 id="ubicacion" className="text-section leading-tight text-evergreen">
            Ubicación de la oficina
          </h2>
          <OfficeMap
            offices={mapOffices}
            activeId={oficina.id}
            focusId={null}
            zoom={15}
            label={`Ubicación de ${oficina.nombre}`}
            className="mt-6 h-80 rounded-card border border-ash-grey/50"
          />
        </section>
      )}
    </article>
  )
}
