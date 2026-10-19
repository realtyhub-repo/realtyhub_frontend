import { ChevronRight, Coins, RotateCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ESTADOS_COMISION, getResumen, listComisiones } from '@/api/comisionApi'
import { useAuth } from '@/auth/auth-context'
import { PageHeader } from '@/components/panel/PageHeader'
import { Segmented } from '@/components/panel/Segmented'
import { EmptyState, LoadError } from '@/components/panel/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { DateRangeFilter } from '@/components/visit/DateRangeFilter'
import { useAsync } from '@/hooks/useAsync'
import {
  ADMIN,
  ESTADO_COMISION_BADGE,
  ESTADO_COMISION_LABELS,
  GERENTE,
  PERSPECTIVA,
  comisionErrorInfo,
  montoPrincipal,
  parseIsoDate,
  periodosComision,
  requiereAccion,
  toIsoDate,
} from '@/lib/commission'
import { TIPO_CONTRATO_LABELS, formatFechaLarga } from '@/lib/contract'
import { formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'
import { nowInBogota } from '@/lib/visit'

const PLURAL = { PENDIENTE: 'Pendientes', APROBADA: 'Aprobadas', PAGADA: 'Pagadas', ANULADA: 'Anuladas', REVERTIDA: 'Revertidas' }

const DESCRIPCION = {
  AGENTE: 'Lo que te corresponde por cada contrato firmado. Se calcula al firmar y avanza a aprobada y pagada.',
  [GERENTE]: 'Comisiones de los contratos firmados por los agentes de tu oficina. Aprueba las pendientes para que se puedan pagar.',
  [ADMIN]: 'Todas las comisiones de la red. Aprueba, registra pagos y revierte cuando haga falta.',
}

/**
 * Comisiones (docs/comisiones-service.md §1–§2): resumen del periodo según la perspectiva del rol y lista paginada
 * (`GET /comisiones`) con filtros de estado y fechas. Los filtros viven en la URL. El periodo por defecto es el del
 * resumen: 1 de enero → hoy. Las que esperan una acción de este rol van destacadas.
 */
export default function CommissionsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [now] = useState(nowInBogota)
  const defaultRange = periodosComision(now)[0]

  const estado = ESTADOS_COMISION.includes(params.get('estado')) ? params.get('estado') : ''
  const desde = params.get('desde') ?? toIsoDate(defaultRange.from)
  const hasta = params.get('hasta') ?? toIsoDate(defaultRange.to)
  const pagina = Math.max(0, Number.parseInt(params.get('pagina') ?? '0', 10) || 0)
  const range = useMemo(() => ({ from: parseIsoDate(desde) ?? defaultRange.from, to: parseIsoDate(hasta) ?? defaultRange.to }), [desde, hasta, defaultRange.from, defaultRange.to])

  function update(changes) {
    const next = { estado, desde, hasta, pagina: 0, ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== '' && !(k === 'pagina' && !v))), { replace: true })
  }

  const resumen = useAsync((signal) => getResumen({ desde, hasta, signal }), [desde, hasta])
  const result = useAsync((signal) => listComisiones({ estado, desde, hasta, pagina, signal }), [estado, desde, hasta, pagina])
  const comisiones = result.data?.contenido ?? []
  const total = result.data?.totalElementos ?? 0

  const counts = Object.fromEntries((resumen.data?.porEstado ?? []).map((e) => [e.estado, e.cantidad]))
  const filtros = [
    { value: '', label: 'Todas' },
    ...ESTADOS_COMISION.map((e) => ({ value: e, label: PLURAL[e], count: resumen.data ? (counts[e] ?? 0) : undefined })),
  ]
  const accionLabel = user.rol === ADMIN ? 'Pendientes de aprobar o pagar' : 'Pendientes de aprobar'

  function refreshAll() {
    resumen.reload()
    result.reload()
  }

  const refreshing = (result.loading && !!result.data) || (resumen.loading && !!resumen.data)

  return (
    <div className="max-w-6xl space-y-8">
      <PageHeader
        title="Comisiones"
        description={DESCRIPCION[user.rol]}
        actions={
          <>
            {(user.rol === ADMIN || user.rol === GERENTE) && (
              <Button variant="outline" asChild>
                <Link to="/panel/acuerdos">Acuerdos comerciales</Link>
              </Button>
            )}
            <Button variant="outline" onClick={refreshAll} loading={refreshing}>
              {!refreshing && <RotateCw strokeWidth={1.75} aria-hidden="true" />}
              Actualizar
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-muted-foreground">
          Contratos firmados entre el <span className="font-medium text-evergreen">{formatFechaLarga(desde)}</span> y el{' '}
          <span className="font-medium text-evergreen">{formatFechaLarga(hasta)}</span>
        </p>
        <DateRangeFilter value={range} buildPresets={periodosComision} onChange={(r) => update({ desde: toIsoDate(r.from), hasta: toIsoDate(r.to) })} />
      </div>

      <Summary resumen={resumen} />

      <section aria-labelledby="lista-comisiones" className="space-y-4">
        <h2 id="lista-comisiones" className="sr-only">
          Lista de comisiones
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented label="Estado de la comisión" options={filtros} value={estado} onChange={(v) => update({ estado: v })} />
          {result.data && total > 0 && (
            <p className="text-small tabular-nums text-muted-foreground">
              {total} {total === 1 ? 'comisión' : 'comisiones'}
            </p>
          )}
        </div>

        {result.error && !result.data ? (
          <LoadError error={{ ...result.error, mensaje: comisionErrorInfo(result.error).text }} onRetry={result.reload} />
        ) : result.loading && !result.data ? (
          <RowsSkeleton />
        ) : comisiones.length === 0 ? (
          estado ? (
            <EmptyState
              icon={Search}
              title={`No hay comisiones ${PLURAL[estado].toLowerCase()} en este periodo`}
              action={
                <Button variant="outline" size="sm" onClick={() => update({ estado: '' })}>
                  Ver todas
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Coins}
              title="Aún no hay comisiones"
              text="Se generan cuando se firma un contrato. Si acabas de firmar uno, puede tardar unos segundos en aparecer."
              action={
                <Button variant="outline" size="sm" onClick={refreshAll}>
                  <RotateCw strokeWidth={1.75} aria-hidden="true" />
                  Actualizar
                </Button>
              }
            />
          )
        ) : (
          <div className={cn('overflow-hidden rounded-card border border-ash-grey/60 transition-opacity duration-200', result.loading && 'opacity-60')}>
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(150px,auto)_16px] gap-6 border-b border-ash-grey/50 bg-pale-oak/15 px-5 py-2.5 text-meta font-medium text-muted-foreground md:grid">
              <span>Contrato</span>
              <span>Agente</span>
              <span>Firmado</span>
              <span className="text-right">{montoLabelRol(user.rol)}</span>
              <span />
            </div>
            <ul className="divide-y divide-ash-grey/40">
              {comisiones.map((c) => (
                <li key={c.id}>
                  <CommissionRow comision={c} rol={user.rol} destacar={requiereAccion(c, user)} accionLabel={accionLabel} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <Pagination page={result.data?.pagina ?? pagina} totalPages={result.data?.totalPaginas} onChange={(p) => update({ pagina: p })} className="pt-2" />
      </section>
    </div>
  )
}

function montoLabelRol(rol) {
  return rol === 'AGENTE' ? 'Tu comisión' : rol === GERENTE ? 'Para tu oficina' : 'Comisión total'
}

function CommissionRow({ comision: c, rol, destacar, accionLabel }) {
  const principal = montoPrincipal(c, rol)
  const final = c.estado === 'ANULADA' || c.estado === 'REVERTIDA'
  return (
    <Link
      to={`/panel/comisiones/${c.id}`}
      className={cn(
        'group relative grid grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-150 focus-visible:bg-pale-oak/15 focus-visible:outline-none md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(150px,auto)_16px] md:gap-6',
        destacar ? 'bg-warning/[0.05] hover:bg-warning/[0.09]' : 'hover:bg-pale-oak/10',
      )}
    >
      {destacar && <span className="absolute inset-y-0 left-0 w-0.5 bg-warning" aria-hidden="true" />}

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-evergreen">{TIPO_CONTRATO_LABELS[c.tipoContrato] ?? c.tipoContrato}</span>
          <Badge variant={ESTADO_COMISION_BADGE[c.estado] ?? 'outline'} dot>
            {ESTADO_COMISION_LABELS[c.estado] ?? c.estado}
          </Badge>
        </div>
        {destacar ? (
          <p className="text-meta font-medium text-[#7a5824]">{c.estado === 'PENDIENTE' ? 'Por aprobar' : 'Por pagar'}</p>
        ) : (
          <p className="text-meta text-muted-foreground">
            {c.tipoContrato === 'ALQUILER' ? 'Canon' : 'Precio'} {formatPrice(c.precioBase)}
          </p>
        )}
        <p className="text-small text-muted-foreground md:hidden">
          {c.nombreAgente ?? 'Agente'} · {formatFechaLarga(c.firmadoEn)}
        </p>
      </div>

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-small font-medium text-evergreen">{c.nombreAgente ?? '—'}</p>
        <p className="truncate text-meta text-muted-foreground">{c.nombreOficina ?? '—'}</p>
      </div>

      <p className="hidden text-small text-muted-foreground md:block">{formatFechaLarga(c.firmadoEn)}</p>

      <div className="text-right">
        <p className={cn('font-display text-subtitle font-semibold tabular-nums', final ? 'text-ash-grey line-through' : 'text-evergreen')}>{formatPrice(principal.monto)}</p>
        {rol === GERENTE && principal.monto !== c.montoTotal ? (
          <p className="text-meta tabular-nums text-muted-foreground">de {formatPrice(c.montoTotal)}</p>
        ) : (
          <p className="text-meta text-muted-foreground md:hidden">{principal.label}</p>
        )}
      </div>

      <ChevronRight className="size-4 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
      {destacar && <span className="sr-only">{accionLabel}</span>}
    </Link>
  )
}

/**
 * Resumen del periodo (`GET /comisiones/resumen`). Rotulado por perspectiva para no confundir "lo mío" con el total:
 * "Por cobrar" = PENDIENTE + APROBADA, "Cobrado" = PAGADA. Anuladas y revertidas quedan como nota al margen.
 */
function Summary({ resumen }) {
  if (resumen.error && !resumen.data) {
    return <LoadError error={{ ...resumen.error, mensaje: comisionErrorInfo(resumen.error).text }} onRetry={resumen.reload} />
  }
  if (!resumen.data) {
    return <span className="block h-44 animate-pulse rounded-card bg-pale-oak/25" role="status" aria-label="Cargando resumen" />
  }

  const by = Object.fromEntries(resumen.data.porEstado.map((e) => [e.estado, e]))
  const get = (e) => by[e] ?? { cantidad: 0, monto: 0 }
  const p = PERSPECTIVA[resumen.data.perspectiva] ?? PERSPECTIVA.MONTO_TOTAL
  const pendiente = get('PENDIENTE')
  const aprobada = get('APROBADA')
  const pagada = get('PAGADA')
  const porCobrar = pendiente.monto + aprobada.monto
  const cerradas = [get('ANULADA'), get('REVERTIDA')]

  return (
    <section aria-labelledby="resumen-comisiones" className={cn('rounded-card bg-pale-oak/25 p-6 transition-opacity duration-200 sm:p-8', resumen.loading && 'opacity-60')}>
      <h2 id="resumen-comisiones" className="text-small font-medium text-muted-foreground">
        {p.titulo}
      </h2>

      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-0 md:divide-x md:divide-evergreen/10">
        <div className="md:pr-8">
          <p className="text-small text-muted-foreground">{p.cobrado}</p>
          <p className="mt-1 font-display text-hero font-bold leading-none tabular-nums text-evergreen">{formatPrice(pagada.monto)}</p>
          <p className="mt-2 text-small text-muted-foreground">
            {pagada.cantidad} {pagada.cantidad === 1 ? 'comisión pagada' : 'comisiones pagadas'}
          </p>
        </div>

        <div className="space-y-4 md:pl-8">
          <div>
            <p className="text-small text-muted-foreground">{p.porCobrar}</p>
            <p className="mt-1 font-display text-section font-semibold leading-none tabular-nums text-evergreen">{formatPrice(porCobrar)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-evergreen/10 pt-4">
            <SummaryCell label="Pendiente de aprobar" item={pendiente} tone="bg-warning" />
            <SummaryCell label="Aprobada, sin pagar" item={aprobada} tone="bg-emerald-depths" />
          </dl>
        </div>
      </div>

      {cerradas.some((e) => e.cantidad > 0) && (
        <p className="mt-6 border-t border-evergreen/10 pt-4 text-small text-muted-foreground">
          Fuera del total: {get('ANULADA').cantidad} {get('ANULADA').cantidad === 1 ? 'anulada' : 'anuladas'} ({formatPrice(get('ANULADA').monto)}) y{' '}
          {get('REVERTIDA').cantidad} {get('REVERTIDA').cantidad === 1 ? 'revertida' : 'revertidas'} ({formatPrice(get('REVERTIDA').monto)}).
        </p>
      )}
    </section>
  )
}

function SummaryCell({ label, item, tone }) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-2 text-meta text-muted-foreground">
        <span className={cn('size-2 rounded-full', tone)} aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-medium tabular-nums text-evergreen">{formatPrice(item.monto)}</dd>
      <dd className="text-meta tabular-nums text-muted-foreground">
        {item.cantidad} {item.cantidad === 1 ? 'comisión' : 'comisiones'}
      </dd>
    </div>
  )
}

function RowsSkeleton() {
  return (
    <div className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60" role="status" aria-label="Cargando comisiones">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <div className="flex-1 space-y-2">
            <span className="block h-3.5 w-40 animate-pulse rounded-full bg-pale-oak/40" />
            <span className="block h-3 w-24 animate-pulse rounded-full bg-pale-oak/30" />
          </div>
          <span className="hidden h-3 w-32 animate-pulse rounded-full bg-pale-oak/30 md:block" />
          <span className="h-5 w-28 animate-pulse rounded-full bg-pale-oak/40" />
        </div>
      ))}
    </div>
  )
}
