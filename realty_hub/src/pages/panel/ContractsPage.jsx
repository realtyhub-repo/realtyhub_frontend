import { ChevronRight, FileText, RotateCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ESTADOS_CONTRATO, listMisContratos } from '@/api/contratoApi'
import { useAuth } from '@/auth/auth-context'
import { PageHeader } from '@/components/panel/PageHeader'
import { Segmented } from '@/components/panel/Segmented'
import { EmptyState, LoadError } from '@/components/panel/States'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { usePropertySummaries } from '@/hooks/usePropertySummaries'
import { ESTADO_CONTRATO_BADGE, ESTADO_CONTRATO_LABELS, TIPO_CONTRATO_LABELS, contratoErrorInfo, formatFechaLarga } from '@/lib/contract'
import { formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

const FILTROS = [
  { value: '', label: 'Todos' },
  ...ESTADOS_CONTRATO.map((e) => ({ value: e, label: { BORRADOR: 'Borradores', FIRMADO: 'Firmados', CANCELADO: 'Cancelados' }[e] })),
]

/** Espera antes del reintento automático cuando el borrador aún no aparece (se genera de forma asíncrona). */
const REINTENTO_MS = 4000

/**
 * Mis contratos (agente y cliente, docs/contratos-service.md §1): `GET /contratos/mis-contratos` con `estado`
 * opcional, del más reciente al más antiguo. La lista no trae dirección ni contraparte; el título de la propiedad
 * se carga aparte para poder reconocer cada contrato.
 * Si se llega desde un lead recién pasado a OFERTA_ACEPTADA (`state.leadId`) y su borrador aún no está, se avisa
 * y se reintenta una vez.
 */
export default function ContractsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const estado = ESTADOS_CONTRATO.includes(params.get('estado')) ? params.get('estado') : ''
  const pendingLeadId = location.state?.leadId ?? null
  const agente = user.rol === 'AGENTE'

  const result = useAsync((signal) => listMisContratos({ signal, estado }), [estado])
  const contratos = useMemo(() => result.data ?? [], [result.data])
  const propiedades = usePropertySummaries(contratos.map((c) => c.propiedadId))
  const waitingDraft = !!pendingLeadId && (!estado || estado === 'BORRADOR') && !!result.data && !contratos.some((c) => c.leadId === pendingLeadId)

  // Un único reintento automático mientras se espera el borrador recién generado.
  const [retried, setRetried] = useState(false)
  const { reload } = result
  useEffect(() => {
    if (!waitingDraft || retried) return
    const t = setTimeout(() => {
      setRetried(true)
      reload()
    }, REINTENTO_MS)
    return () => clearTimeout(t)
  }, [waitingDraft, retried, reload])

  const borradores = contratos.filter((c) => c.estado === 'BORRADOR').length

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Contratos"
        description={
          agente
            ? 'Se generan como borrador cuando un cliente acepta una oferta. Revisa el precio, fírmalos y comparte el PDF.'
            : 'Los contratos de las propiedades en las que aceptaste una oferta. Puedes revisarlos y descargar el PDF firmado.'
        }
        actions={
          <Button variant="outline" onClick={result.reload} loading={result.loading && !!result.data}>
            {!(result.loading && result.data) && <RotateCw strokeWidth={1.75} aria-hidden="true" />}
            Actualizar
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Estado del contrato" options={FILTROS} value={estado} onChange={(v) => setParams(v ? { estado: v } : {}, { replace: true, state: location.state })} />
        {agente && !estado && borradores > 0 && (
          <p className="flex items-center gap-2 text-small text-[#7a5824]">
            <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
            {borradores} {borradores === 1 ? 'pendiente' : 'pendientes'} de firma
          </p>
        )}
      </div>

      {waitingDraft && (
        <Alert variant="info">
          <p>El contrato se está generando. Aparecerá aquí en unos segundos.</p>
          {retried && (
            <Button variant="outline" size="sm" onClick={result.reload} loading={result.loading}>
              Actualizar
            </Button>
          )}
        </Alert>
      )}

      {result.error && !result.data ? (
        <LoadError error={{ ...result.error, mensaje: contratoErrorInfo(result.error).text }} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <ListSkeleton />
      ) : contratos.length === 0 ? (
        estado ? (
          <EmptyState
            icon={Search}
            title={`No tienes contratos ${FILTROS.find((f) => f.value === estado)?.label.toLowerCase()}`}
            action={
              <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>
                Ver todos
              </Button>
            }
          />
        ) : (
          <EmptyState icon={FileText} title="Aún no tienes contratos" text="Se generan cuando un cliente acepta una oferta." />
        )
      ) : (
        <ul className={cn('space-y-3 transition-opacity duration-200', result.loading && 'opacity-60')}>
          {contratos.map((c) => (
            <li key={c.id}>
              <ContractRow contrato={c} propiedad={propiedades[c.propiedadId]} destacar={agente && c.estado === 'BORRADOR'} nuevo={c.leadId === pendingLeadId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ContractRow({ contrato: c, propiedad: p, destacar, nuevo }) {
  return (
    <Link
      to={`/panel/contratos/${c.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-card border p-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-5 sm:p-5',
        destacar ? 'border-warning/50 bg-warning/[0.05] hover:border-warning' : 'border-ash-grey/60 hover:border-ash-grey hover:bg-pale-oak/10',
        nuevo && 'ring-2 ring-emerald-depths/30',
      )}
    >
      <PropertyPhoto src={p?.foto} alt="" label="" className={cn('hidden aspect-[4/3] w-28 shrink-0 rounded-control sm:block', c.estado === 'CANCELADO' && 'opacity-60')} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small font-medium text-emerald-depths">{TIPO_CONTRATO_LABELS[c.tipo] ?? c.tipo}</span>
          <Badge variant={ESTADO_CONTRATO_BADGE[c.estado] ?? 'outline'} dot>
            {ESTADO_CONTRATO_LABELS[c.estado] ?? c.estado}
          </Badge>
          {destacar && <span className="text-meta font-medium text-[#7a5824]">Pendiente de firma</span>}
        </div>
        <p className="line-clamp-1 font-medium text-evergreen">
          {p?.titulo ?? (p?.missing ? 'Propiedad' : <span className="inline-block h-3.5 w-48 animate-pulse rounded-full bg-pale-oak/40 align-middle" />)}
        </p>
        <p className="text-small text-muted-foreground">Creado el {formatFechaLarga(c.createdAt)}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn('font-display text-subtitle font-semibold tabular-nums', c.estado === 'CANCELADO' ? 'text-ash-grey line-through' : 'text-evergreen')}>
          {formatPrice(c.precioAcordado)}
        </p>
        <p className="text-meta text-muted-foreground">{c.tipo === 'ALQUILER' ? 'Canon mensual' : 'Precio acordado'}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando contratos">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-5 rounded-card border border-ash-grey/50 p-5">
          <span className="hidden aspect-[4/3] w-28 animate-pulse rounded-control bg-pale-oak/30 sm:block" />
          <div className="flex-1 space-y-2">
            <span className="block h-3 w-32 animate-pulse rounded-full bg-pale-oak/40" />
            <span className="block h-4 w-2/3 animate-pulse rounded-full bg-pale-oak/30" />
          </div>
          <span className="h-6 w-28 animate-pulse rounded-full bg-pale-oak/40" />
        </div>
      ))}
    </div>
  )
}
