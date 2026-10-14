import { Link } from 'react-router'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { ESTADO_LABELS, MODALIDAD_FRASE, TIPO_LABELS, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

/**
 * Tarjeta del catálogo público (listado liviano, docs §4.1). Sin borde ni sombra: la foto es la tarjeta
 * y el texto la acompaña debajo, como en un portal inmobiliario editorial (CLAUDE.md §1 y §6).
 */
export function PropertyCard({ propiedad: p, priority = false }) {
  const unavailable = p.estadoComercial !== 'DISPONIBLE'

  return (
    <article className="group relative">
      <div className="relative overflow-hidden rounded-card">
        <PropertyPhoto
          src={p.urlPortada}
          alt={p.titulo}
          loading={priority ? 'eager' : 'lazy'}
          className="aspect-[4/3]"
          imgClassName={cn(
            'transition-[scale,filter] duration-200 ease-out group-hover:scale-[1.03]',
            unavailable && 'saturate-[0.6]',
          )}
        />
        <span className="absolute left-3 top-3 rounded-full bg-floral-white/95 px-2.5 py-1 text-meta font-medium text-evergreen shadow-[0_1px_2px_rgb(10_59_53/0.12)]">
          {TIPO_LABELS[p.tipoPropiedad] ?? p.tipoPropiedad} {MODALIDAD_FRASE[p.modalidad] ?? ''}
        </span>
        {unavailable && (
          <span className="absolute bottom-3 left-3 rounded-full bg-evergreen/90 px-2.5 py-1 text-meta font-medium text-floral-white">
            {ESTADO_LABELS[p.estadoComercial] ?? p.estadoComercial}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <p className="font-display text-subtitle font-bold leading-tight text-evergreen tabular-nums">
          {formatPrice(p.precio)}
          {p.modalidad === 'ALQUILER' && <span className="ml-1 font-sans text-small font-normal text-muted-foreground">/ mes</span>}
        </p>
        <h3 className="font-sans text-body font-normal leading-snug text-evergreen">
          {/* El enlace cubre toda la tarjeta para un único objetivo de clic */}
          <Link
            to={`/propiedades/${p.id}`}
            className="line-clamp-2 after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-floral-white"
          >
            {p.titulo}
          </Link>
        </h3>
        <p className="text-small text-muted-foreground">{p.ciudad}</p>
      </div>
    </article>
  )
}

/** Hueco de carga con la misma geometría que la tarjeta (evita saltos al llegar los datos). */
export function PropertyCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse rounded-card bg-pale-oak/30" />
      <div className="mt-4 space-y-2">
        <span className="block h-5 w-1/2 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-4 w-4/5 animate-pulse rounded-full bg-pale-oak/30" />
        <span className="block h-3 w-1/3 animate-pulse rounded-full bg-pale-oak/25" />
      </div>
    </div>
  )
}
