import { Eye } from 'lucide-react'
import { Link } from 'react-router'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { MODALIDAD_FRASE, TIPO_LABELS, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

const viewsFormat = new Intl.NumberFormat('es-CO')

/**
 * Tarjeta del ranking de más vistas. El número del puesto es parte del contenido (el orden importa):
 * va grande junto al precio y la foto no lleva nada encima salvo el tipo de propiedad.
 * `featured` agranda la foto y el número para los dos primeros puestos.
 */
export function RankedPropertyCard({ propiedad: p, rank, featured = false, className }) {
  return (
    <article className={cn('group relative', className)}>
      <div className="relative overflow-hidden rounded-card">
        <PropertyPhoto
          src={p.urlPortada}
          alt={p.titulo}
          loading={rank <= 2 ? 'eager' : 'lazy'}
          className={cn('aspect-[4/3]', featured && 'lg:aspect-auto lg:h-[26rem]')}
          imgClassName="transition-[scale] duration-200 ease-out group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-floral-white/95 px-2.5 py-1 text-meta font-medium text-evergreen shadow-[0_1px_2px_rgb(10_59_53/0.12)]">
          {TIPO_LABELS[p.tipoPropiedad] ?? p.tipoPropiedad} {MODALIDAD_FRASE[p.modalidad] ?? ''}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5">
        <span
          aria-hidden="true"
          className={cn(
            'font-display font-bold leading-[0.8] text-evergreen tabular-nums',
            featured ? 'text-[4.5rem]' : 'text-[3rem]',
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'font-display font-bold leading-tight text-evergreen tabular-nums',
              featured ? 'text-section' : 'text-subtitle',
            )}
          >
            {formatPrice(p.precio)}
            {p.modalidad === 'ALQUILER' && (
              <span className="ml-1 font-sans text-small font-normal text-muted-foreground">/ mes</span>
            )}
          </p>
          <h3 className="font-sans text-body font-normal leading-snug text-evergreen">
            <Link
              to={`/propiedades/${p.id}`}
              className="line-clamp-2 after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-floral-white"
            >
              <span className="sr-only">Puesto {rank}. </span>
              {p.titulo}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted-foreground">
            <span>{p.ciudad}</span>
            {p.vistas > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-4 text-emerald-depths" strokeWidth={1.5} aria-hidden="true" />
                <span className="tabular-nums">{viewsFormat.format(p.vistas)}</span> {p.vistas === 1 ? 'vista' : 'vistas'}
              </span>
            )}
          </p>
        </div>
      </div>
    </article>
  )
}

/** Hueco de carga con la misma cuadrícula del ranking (evita saltos al llegar los datos). */
export function RankedSkeleton() {
  const spans = ['md:col-span-2 lg:col-span-7', 'lg:col-span-5', 'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4']
  return (
    <div aria-hidden="true" className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
      {spans.map((span, i) => (
        <div key={span + i} className={span}>
          <div className={cn('aspect-[4/3] animate-pulse rounded-card bg-pale-oak/30', i < 2 && 'lg:aspect-auto lg:h-[26rem]')} />
          <div className="mt-5 flex gap-5">
            <span className="block h-12 w-10 animate-pulse rounded bg-pale-oak/40" />
            <div className="flex-1 space-y-2">
              <span className="block h-5 w-1/2 animate-pulse rounded-full bg-pale-oak/40" />
              <span className="block h-4 w-4/5 animate-pulse rounded-full bg-pale-oak/30" />
              <span className="block h-3 w-1/3 animate-pulse rounded-full bg-pale-oak/25" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
