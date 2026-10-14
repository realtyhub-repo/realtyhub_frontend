import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ESTADOS_COMERCIALES, cambiarEstado, getPropiedad, updatePropiedad } from '@/api/propertyApi'
import { useAuth } from '@/auth/auth-context'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { PhotoManager } from '@/components/property/PhotoManager'
import { PropertyForm } from '@/components/property/PropertyForm'
import { StatusBadge } from '@/components/property/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/format'
import { ESTADO_LABELS, MODALIDAD_FRASE, TIPO_LABELS, canManage, formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'fotos', label: 'Fotos' },
  { id: 'datos', label: 'Datos' },
]

/**
 * Gestión de una propiedad: estado comercial, fotos y datos. Editar es solo para el agente dueño o el
 * administrador central (docs §2); el backend lo vuelve a validar y responde 403.
 */
export default function PropertyManagePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [toast, showToast] = useToast()
  const [formVersion, setFormVersion] = useState(0)
  const data = useAsync((signal) => getPropiedad(id, { signal }), [id])
  const p = data.data

  // Recarga el detalle tras una mutación sin vaciar la pantalla (el estado puede cambiar también por fuera, docs §4.3).
  async function refresh() {
    data.setData(await getPropiedad(id))
  }

  if (data.error && !p) {
    return (
      <div className="max-w-7xl space-y-6">
        <BackLink />
        {data.error.status === 404 || data.error.status === 400 ? (
          <Alert variant="warning">
            <p>Esta propiedad no existe o el enlace está incompleto.</p>
          </Alert>
        ) : (
          <LoadError error={data.error} onRetry={data.reload} />
        )}
      </div>
    )
  }
  if (!p) return <ManageSkeleton />

  const editable = canManage(p, user)
  const tab = editable && params.get('seccion') === 'datos' ? 'datos' : 'fotos'
  const published = location.state?.published

  return (
    <div className="max-w-7xl space-y-8">
      <div className="space-y-4">
        <BackLink />
        <header className="flex flex-col gap-6 border-b border-ash-grey/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-page leading-tight text-evergreen">{p.titulo}</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
              <span>
                {TIPO_LABELS[p.tipoPropiedad]} {MODALIDAD_FRASE[p.modalidad]}
              </span>
              <Dot />
              <span>{p.ciudad}</span>
              <Dot />
              <span className="font-medium tabular-nums text-evergreen">
                {formatPrice(p.precio)}
                {p.modalidad === 'ALQUILER' && <span className="font-normal text-muted-foreground"> /mes</span>}
              </span>
              <Dot />
              <span>{p.nombreAgente ?? 'Sin agente'}</span>
              {p.createdAt && (
                <>
                  <Dot />
                  <span>Publicada el {formatDate(p.createdAt)}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {editable ? (
              <StatusControl propiedad={p} onChanged={refresh} onToast={showToast} />
            ) : (
              <StatusBadge estado={p.estadoComercial} className="text-small" />
            )}
            <a href={`/propiedades/${p.id}`} target="_blank" rel="noopener" className={buttonVariants({ variant: 'outline' })}>
              <ExternalLink strokeWidth={1.75} aria-hidden="true" />
              Ver en el catálogo
            </a>
          </div>
        </header>
      </div>

      {published && (
        <Alert variant="success">
          <p>Propiedad publicada. Agrega las fotos: la primera queda como portada si no eliges otra.</p>
        </Alert>
      )}
      {!editable && (
        <Alert variant="info">
          <p>
            Esta propiedad está a cargo de {p.nombreAgente ?? 'otro agente'}. Solo esa persona o un administrador central puede editarla.
          </p>
        </Alert>
      )}

      {editable && (
        <div role="tablist" aria-label="Secciones" className="flex gap-6 border-b border-ash-grey/50">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => setParams(t.id === 'fotos' ? {} : { seccion: t.id }, { replace: true, state: null })}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-evergreen',
                )}
              >
                {t.label}
                {t.id === 'fotos' && <span className="ml-1.5 tabular-nums text-muted-foreground">{p.imagenes?.length ?? 0}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div role={editable ? 'tabpanel' : undefined} id={`panel-${tab}`} aria-labelledby={editable ? `tab-${tab}` : undefined}>
        {tab === 'fotos' ? (
          <PhotoManager propiedadId={p.id} imagenes={p.imagenes ?? []} editable={editable} onChanged={refresh} onToast={showToast} />
        ) : (
          <PropertyForm
            key={formVersion}
            initial={p}
            submitLabel="Guardar cambios"
            savingLabel="Guardando cambios"
            onSubmit={async (changes) => {
              await updatePropiedad(p.id, changes)
              await refresh()
              setFormVersion((v) => v + 1)
              showToast('Cambios guardados')
            }}
          />
        )}
      </div>

      {toast}
    </div>
  )
}

/** Estado comercial: se aplica al elegirlo (cambio libre entre los cuatro, docs §4.3). */
function StatusControl({ propiedad, onChanged, onToast }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  async function change(e) {
    const nuevo = e.target.value
    setPending(true)
    setError(null)
    try {
      await cambiarEstado(propiedad.id, nuevo)
      await onChanged()
      onToast(`Estado actualizado: ${ESTADO_LABELS[nuevo].toLowerCase()}`)
    } catch (err) {
      setError(err.status === 403 ? 'No tienes permiso para cambiar el estado.' : err.mensaje)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="estado-comercial" className="block text-small font-medium text-evergreen">
        Estado comercial
      </label>
      <Select id="estado-comercial" value={propiedad.estadoComercial} onChange={change} disabled={pending} className="w-48" aria-describedby={error ? 'estado-error' : undefined}>
        {ESTADOS_COMERCIALES.map((s) => (
          <option key={s} value={s}>
            {ESTADO_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && (
        <p id="estado-error" className="max-w-48 text-small text-error">
          {error}
        </p>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/panel/propiedades"
      className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen"
    >
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Propiedades
    </Link>
  )
}

function Dot() {
  return (
    <span className="text-ash-grey" aria-hidden="true">
      ·
    </span>
  )
}

function ManageSkeleton() {
  return (
    <div className="max-w-7xl space-y-6" role="status" aria-label="Cargando propiedad">
      <span className="block h-4 w-28 animate-pulse rounded-full bg-pale-oak/40" />
      <span className="block h-9 w-2/3 animate-pulse rounded-full bg-pale-oak/40" />
      <span className="block h-4 w-1/2 animate-pulse rounded-full bg-pale-oak/30" />
      <div className="grid grid-cols-2 gap-4 pt-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className="aspect-[4/3] animate-pulse rounded-card bg-pale-oak/25" />
        ))}
      </div>
    </div>
  )
}
