import { Bath, BedDouble, Car, Check, ChevronLeft, Link2, MapPin, PencilLine, Ruler } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPropiedad } from '@/api/propertyApi'
import { useAuth } from '@/auth/auth-context'
import { OfficeMap } from '@/components/map/OfficeMap'
import { PropertyGallery } from '@/components/property/PropertyGallery'
import { StatusBadge } from '@/components/property/StatusBadge'
import { PublicError } from '@/components/public/PublicStates'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/format'
import {
  MODALIDAD_FRASE,
  TIPO_LABELS,
  canManage,
  describeCaracteristicas,
  formatNumber,
  formatPrice,
  keyFacts,
} from '@/lib/property'

const BACK = { to: '/propiedades', label: 'Ver propiedades' }

/**
 * Detalle público de una propiedad (`GET /propiedades/{id}`). Manda el token si hay sesión para que la
 * vista del agente dueño no cuente (docs §4.2). Fotografía primero, texto acompañando (CLAUDE.md §1).
 */
export default function PropertyDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const data = useAsync((signal) => getPropiedad(id, { signal }), [id])
  const p = data.data

  const mapPoints = useMemo(
    () =>
      p && Number.isFinite(p.latitud) && Number.isFinite(p.longitud)
        ? [{ id: p.id, nombre: p.titulo, latitud: p.latitud, longitud: p.longitud }]
        : [],
    [p],
  )

  if (data.error) return <PublicError error={data.error} notFoundTitle="No encontramos esta propiedad" onRetry={data.reload} back={BACK} />
  if (data.loading) return <DetailSkeleton />

  const facts = keyFacts(p.caracteristicas)
  const caracteristicas = describeCaracteristicas(p.caracteristicas, p.tipoPropiedad)
  const tipo = `${TIPO_LABELS[p.tipoPropiedad] ?? p.tipoPropiedad} ${MODALIDAD_FRASE[p.modalidad] ?? ''}`

  return (
    <article className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <Link
        to="/propiedades"
        className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Todas las propiedades
      </Link>

      <div className="mt-6">
        <PropertyGallery imagenes={p.imagenes} titulo={p.titulo} />
      </div>

      <div className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <header className="space-y-4 lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small font-medium text-emerald-depths">{tipo}</span>
            <span className="text-ash-grey" aria-hidden="true">
              ·
            </span>
            <StatusBadge estado={p.estadoComercial} />
          </div>
          <h1 className="max-w-[28ch] text-page leading-tight text-evergreen">{p.titulo}</h1>
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>
              {p.direccion}
              {p.direccion && p.ciudad ? ', ' : ''}
              {p.ciudad}
            </span>
          </p>
          <Facts facts={facts} />
        </header>

        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="space-y-6 rounded-card bg-pale-oak/25 p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-small text-muted-foreground">{p.modalidad === 'ALQUILER' ? 'Canon de arriendo' : 'Precio de venta'}</p>
              <p className="mt-1 font-display text-hero font-bold leading-none text-evergreen tabular-nums">{formatPrice(p.precio)}</p>
              {p.modalidad === 'ALQUILER' && <p className="mt-1 text-small text-muted-foreground">por mes</p>}
              {facts.area && p.precio > 0 && p.modalidad === 'VENTA' && (
                <p className="mt-2 text-small text-muted-foreground tabular-nums">
                  {formatPrice(Math.round(p.precio / facts.area))} por m²
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-evergreen/10 pt-6">
              <Avatar name={p.nombreAgente} className="size-12 text-body" />
              <div className="min-w-0">
                <p className="truncate font-display text-subtitle font-semibold leading-tight text-evergreen">{p.nombreAgente ?? 'Agente RealtyHub'}</p>
                <p className="text-small text-muted-foreground">Agente a cargo</p>
              </div>
            </div>

            <div className="space-y-2">
              {canManage(p, user) && (
                <Link to={`/panel/propiedades/${p.id}`} className={buttonVariants({ className: 'w-full' })}>
                  <PencilLine strokeWidth={1.75} aria-hidden="true" />
                  Gestionar propiedad
                </Link>
              )}
              <CopyLinkButton />
            </div>

            {p.createdAt && <p className="text-meta text-muted-foreground">Publicada el {formatDate(p.createdAt, { dateStyle: 'long' })}</p>}
          </div>
        </aside>

        <div className="space-y-14 lg:col-start-1">
          {p.descripcion && (
            <section aria-labelledby="descripcion">
              <h2 id="descripcion" className="text-section leading-tight text-evergreen">
                Descripción
              </h2>
              <p className="mt-4 max-w-[75ch] whitespace-pre-line leading-relaxed text-evergreen/90">{p.descripcion}</p>
            </section>
          )}

          {caracteristicas.length > 0 && (
            <section aria-labelledby="caracteristicas">
              <h2 id="caracteristicas" className="text-section leading-tight text-evergreen">
                Características
              </h2>
              <dl className="mt-4 grid gap-x-10 sm:grid-cols-2">
                {caracteristicas.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-4 border-b border-ash-grey/50 py-3">
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="text-right font-medium text-evergreen tabular-nums">
                      {c.raw === true ? <Check className="inline size-[18px] text-success" strokeWidth={2} aria-label="Sí" /> : c.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {mapPoints.length > 0 && (
            <section aria-labelledby="ubicacion">
              <h2 id="ubicacion" className="text-section leading-tight text-evergreen">
                Ubicación
              </h2>
              <p className="mt-2 text-muted-foreground">{p.ciudad}</p>
              <OfficeMap
                offices={mapPoints}
                activeId={p.id}
                focusId={null}
                zoom={15}
                label={`Ubicación de ${p.titulo}`}
                className="mt-4 h-[380px] rounded-card border border-ash-grey/50"
              />
            </section>
          )}
        </div>
      </div>
    </article>
  )
}

/** Fila de datos clave con íconos de línea; solo los que existan en `caracteristicas`. */
function Facts({ facts }) {
  const items = [
    facts.habitaciones !== null && { icon: BedDouble, value: facts.habitaciones, label: facts.habitaciones === 1 ? 'habitación' : 'habitaciones' },
    facts.banos !== null && { icon: Bath, value: facts.banos, label: facts.banos === 1 ? 'baño' : 'baños' },
    facts.area !== null && { icon: Ruler, value: formatNumber(facts.area), label: 'm²' },
    facts.parqueaderos !== null && facts.parqueaderos > 0 && {
      icon: Car,
      value: facts.parqueaderos,
      label: facts.parqueaderos === 1 ? 'parqueadero' : 'parqueaderos',
    },
  ].filter(Boolean)
  if (!items.length) return null

  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-3 border-y border-ash-grey/50 py-4">
      {items.map(({ icon: Icon, value, label }) => (
        <li key={label} className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-5 text-evergreen" strokeWidth={1.5} aria-hidden="true" />
          <span className="font-display text-subtitle font-semibold text-evergreen tabular-nums">{value}</span>
          {label}
        </li>
      ))}
    </ul>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      // Sin permiso de portapapeles: no hay nada útil que mostrar, el enlace sigue en la barra de direcciones.
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={copy} aria-live="polite">
      {copied ? <Check strokeWidth={1.75} aria-hidden="true" /> : <Link2 strokeWidth={1.75} aria-hidden="true" />}
      {copied ? 'Enlace copiado' : 'Copiar enlace'}
    </Button>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8" role="status" aria-label="Cargando propiedad">
      <span className="block h-4 w-40 animate-pulse rounded-full bg-pale-oak/40" />
      <span className="block h-[clamp(280px,58svh,600px)] animate-pulse rounded-card bg-pale-oak/25" />
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="block h-9 w-3/4 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="block h-5 w-1/2 animate-pulse rounded-full bg-pale-oak/30" />
        </div>
        <span className="block h-64 animate-pulse rounded-card bg-pale-oak/25" />
      </div>
    </div>
  )
}
