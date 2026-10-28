import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { listOficinas } from '@/api/userApi'
import fachada from '@/assets/landing-fachada.webp'
import interior from '@/assets/landing-interior.webp'
import lago from '@/assets/landing-lago.webp'
import sala from '@/assets/landing-sala.webp'
import { PropertyCard } from '@/components/property/PropertyCard'
import { RankedPropertyCard, RankedSkeleton } from '@/components/property/RankedPropertyCard'
import { HeroSearch } from '@/components/public/HeroSearch'
import { PublicMessage } from '@/components/public/PublicStates'
import { buttonVariants } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { useMostViewed } from '@/hooks/useMostViewed'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Elige una propiedad', text: 'Mira las fotos, las características y la ubicación en el mapa de cada casa o apartamento.' },
  { title: 'Agenda tu visita', text: 'Indica la fecha y la hora que prefieras. Te asignamos un agente de la zona que esté libre en ese horario.' },
  { title: 'Conoce la propiedad', text: 'Tu agente te recibe en el lugar, responde tus preguntas y coordina contigo los siguientes pasos.' },
  { title: 'Firma con respaldo', text: 'El contrato se genera y se firma dentro de la plataforma, y puedes seguir cada paso desde tu cuenta.' },
]

function Hero() {
  return (
    <section className="border-b border-ash-grey/40">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex animate-rise flex-col justify-center gap-8 px-4 py-14 sm:px-8 lg:py-24 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-14">
          <div className="space-y-5">
            <h1 className="max-w-[20ch] font-display text-hero font-bold leading-[1.08] text-evergreen lg:text-[3.25rem]">
              Tu próxima casa, con un agente que conoce la zona
            </h1>
            <p className="max-w-[48ch] text-body text-muted-foreground sm:text-subtitle sm:leading-snug">
              Explora casas y apartamentos en venta y en alquiler. Cuando una te interese, agendas la visita y te asignamos un
              agente de la zona.
            </p>
          </div>
          <HeroSearch />
        </div>

        <div className="relative min-h-[320px] lg:min-h-[640px]">
          <img
            src={fachada}
            alt="Fachada blanca de una casa moderna con puerta de madera y olivos en macetas"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover object-[35%_50%]"
          />
        </div>
      </div>
    </section>
  )
}

function MostViewed() {
  const { data, error, loading, reload } = useMostViewed()
  const ranked = data?.ranked
  const items = data?.items ?? []

  return (
    <section aria-labelledby="mas-vistas" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[56ch] space-y-3">
          <h2 id="mas-vistas" className="text-section font-semibold leading-tight text-evergreen lg:text-page">
            {ranked ? 'Las propiedades más vistas' : 'Propiedades disponibles'}
          </h2>
          <p className="text-muted-foreground sm:text-subtitle sm:leading-snug">
            {ranked
              ? `Las que más han mirado las personas que visitan RealtyHub en los últimos ${data.dias} días.`
              : 'Una selección de lo que está disponible hoy.'}
          </p>
        </div>
        <Link to="/propiedades" className={buttonVariants({ variant: 'outline' })}>
          Ver todas las propiedades
        </Link>
      </header>

      <div className="mt-10">
        {loading ? (
          <RankedSkeleton />
        ) : error ? (
          <PublicMessage title="No pudimos cargar las propiedades" text={error.mensaje} onRetry={reload} back={null} />
        ) : items.length === 0 ? (
          <p className="max-w-[48ch] text-muted-foreground">Aún no hay propiedades publicadas. Vuelve pronto.</p>
        ) : ranked ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
            {items.map((p, i) => (
              <RankedPropertyCard
                key={p.id}
                propiedad={p}
                rank={i + 1}
                featured={i < 2}
                className={cn(i === 0 && 'md:col-span-2 lg:col-span-7', i === 1 && 'lg:col-span-5', i > 1 && 'lg:col-span-4')}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <PropertyCard key={p.id} propiedad={p} priority={i < 3} />
            ))}
          </div>
        )}
        {loading && <span className="sr-only">Cargando propiedades</span>}
      </div>
    </section>
  )
}

function Process() {
  return (
    <section aria-labelledby="como-funciona" className="bg-pale-oak/25">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-20 lg:py-28">
        <div>
          <h2 id="como-funciona" className="max-w-[24ch] text-section font-semibold leading-tight text-evergreen lg:text-page">
            De la primera visita a la firma
          </h2>
          <ol className="mt-10">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 pb-9 before:absolute before:bottom-0 before:left-5 before:top-10 before:w-px before:bg-evergreen/25 last:pb-0 last:before:hidden"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full border border-evergreen bg-floral-white font-display text-body font-semibold text-evergreen"
                >
                  {i + 1}
                </span>
                <div className="space-y-1 pt-1.5">
                  <h3 className="font-display text-subtitle font-semibold leading-snug text-evergreen">{step.title}</h3>
                  <p className="max-w-[52ch] text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <figure>
          <img
            src={interior}
            alt="Sala amplia y luminosa con ventanales y cortinas claras"
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full rounded-card object-cover object-[28%_50%]"
          />
        </figure>
      </div>
    </section>
  )
}

const byOffice = (a, b) => (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, 'es') : a.tipo === 'CENTRAL' ? -1 : 1)

function Offices() {
  const oficinas = useAsync((signal) => listOficinas({ signal }), [])
  const list = [...(oficinas.data ?? [])].sort(byOffice).slice(0, 6)

  return (
    <section aria-labelledby="oficinas" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-20">
        <figure>
          <img
            src={sala}
            alt="Sala de estar con sofá de cuero y plantas, junto a una cocina abierta"
            loading="lazy"
            decoding="async"
            className="aspect-[3/2] w-full rounded-card object-cover"
          />
        </figure>

        <div className="space-y-8">
          <div className="space-y-3">
            <h2 id="oficinas" className="max-w-[24ch] text-section font-semibold leading-tight text-evergreen lg:text-page">
              Oficinas con agentes que conocen su zona
            </h2>
            <p className="max-w-[52ch] text-muted-foreground sm:text-subtitle sm:leading-snug">
              Cada oficina reúne a los agentes que mejor conocen su barrio. Puedes visitarlas o conocer a su equipo antes de decidir.
            </p>
          </div>

          {list.length > 0 && (
            <ul className="divide-y divide-ash-grey/50 border-y border-ash-grey/50">
              {list.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/oficinas/${o.id}`}
                    className="group flex items-center gap-4 py-4 transition-colors duration-150 hover:bg-pale-oak/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MapPin className="size-5 shrink-0 text-emerald-depths" strokeWidth={1.5} aria-hidden="true" />
                    <span className="font-display text-subtitle font-semibold leading-tight text-evergreen">{o.nombre}</span>
                    <span className="ml-auto text-small text-muted-foreground">{o.region}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link to="/oficinas" className={buttonVariants({ variant: 'outline' })}>
            Ver todas las oficinas
          </Link>
        </div>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section aria-labelledby="cierre" className="mx-auto max-w-7xl px-4 pb-20 sm:px-8 lg:pb-28">
      <div className="relative isolate overflow-hidden rounded-card">
        <img src={lago} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-evergreen/90 via-evergreen/70 to-evergreen/10" aria-hidden="true" />
        <div className="max-w-2xl space-y-6 px-6 py-16 text-floral-white sm:px-12 lg:py-24">
          <h2 id="cierre" className="font-display text-page font-bold leading-[1.1] lg:text-hero">
            Agenda tu primera visita esta semana
          </h2>
          <p className="max-w-[46ch] text-body text-floral-white/85 sm:text-subtitle sm:leading-snug">
            Elige la propiedad, escoge la fecha y la hora, y un agente de la zona te recibe.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/propiedades?modalidad=VENTA"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-floral-white text-evergreen hover:bg-pale-oak')}
            >
              Ver propiedades en venta
            </Link>
            <Link
              to="/propiedades?modalidad=ALQUILER"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-floral-white/60 text-floral-white hover:border-floral-white hover:bg-floral-white/10',
              )}
            >
              Ver propiedades en alquiler
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Página de inicio pública: hero con búsqueda, más vistas (Analytics), proceso, oficinas y cierre. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <MostViewed />
      <Process />
      <Offices />
      <Closing />
    </>
  )
}
