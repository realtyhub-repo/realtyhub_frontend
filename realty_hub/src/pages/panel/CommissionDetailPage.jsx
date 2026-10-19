import { Check, ChevronLeft, FileText, House, Landmark, Undo2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { aprobarComision, getComision } from '@/api/comisionApi'
import { getUser } from '@/api/userApi'
import { useAuth } from '@/auth/auth-context'
import { PayDialog, RevertDialog } from '@/components/commission/CommissionActionDialogs'
import { BeneficiarioDot, SplitBar } from '@/components/commission/SplitBar'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import {
  ADMIN,
  BENEFICIARIO_LABELS,
  ESTADO_COMISION_BADGE,
  ESTADO_COMISION_LABELS,
  ESTADOS_FINALES,
  canAprobar,
  canPagar,
  canRevertir,
  comisionErrorInfo,
  describeRegla,
  formatPorcentaje,
} from '@/lib/commission'
import { TIPO_CONTRATO_LABELS, formatFechaHora } from '@/lib/contract'
import { formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

/**
 * Detalle de una comisión (`GET /comisiones/{id}`, docs/comisiones-service.md §3–§6): cálculo, reparto, historial
 * y acciones según estado y rol. Tras cada acción se vuelve a pedir el detalle; ante un 409 se recarga y se avisa.
 */
export default function CommissionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [toast, showToast] = useToast()
  const [dialog, setDialog] = useState(null) // 'aprobar' | 'pagar' | 'revertir'
  const [notice, setNotice] = useState(null) // { kind, text }

  const data = useAsync((signal) => getComision(id, { signal }), [id])
  const c = data.data

  const { setData } = data
  const refresh = useCallback(async () => {
    try {
      setData(await getComision(id))
    } catch (err) {
      setNotice({ kind: 'error', text: comisionErrorInfo(err).text })
    }
  }, [id, setData])

  const handleStale = useCallback(
    (info) => {
      setNotice({ kind: 'warning', text: info?.text ?? 'Esta comisión ya cambió de estado.' })
      refresh()
    },
    [refresh],
  )

  if (data.error && !c) {
    const info = comisionErrorInfo(data.error)
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink />
        {[400, 403, 404].includes(data.error.status) ? (
          <Alert variant="warning">
            <p>{data.error.status === 400 ? 'El enlace de la comisión está incompleto.' : info.text}</p>
          </Alert>
        ) : (
          <LoadError error={{ ...data.error, mensaje: info.text }} onRetry={data.reload} />
        )}
      </div>
    )
  }
  if (!c) return <DetailSkeleton />

  const tipo = TIPO_CONTRATO_LABELS[c.tipoContrato] ?? c.tipoContrato
  const soloLineaAgente = user.rol === 'AGENTE'
  const lineaAgente = c.reparto?.find((r) => r.beneficiarioTipo === 'AGENTE')
  const final = ESTADOS_FINALES.has(c.estado)

  async function aprobar() {
    try {
      await aprobarComision(c.id)
      await refresh()
      setNotice(null)
      showToast('Comisión aprobada')
    } catch (err) {
      const info = comisionErrorInfo(err)
      if (info.reload) {
        handleStale(info)
        return
      }
      throw Object.assign(err, { mensaje: info.text })
    }
  }

  return (
    <div className="max-w-6xl space-y-8">
      <BackLink />

      <header className="flex flex-col gap-6 border-b border-ash-grey/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant={ESTADO_COMISION_BADGE[c.estado] ?? 'outline'} dot>
            {ESTADO_COMISION_LABELS[c.estado] ?? c.estado}
          </Badge>
          <h1 className="text-page leading-tight text-evergreen">Comisión de {tipo.toLowerCase()}</h1>
          <p className="text-muted-foreground">
            Contrato firmado el {formatFechaHora(c.firmadoEn)} · {c.nombreOficina ?? 'Oficina'}
          </p>
        </div>
      </header>

      {notice && (
        <Alert variant={notice.kind}>
          <p>{notice.text}</p>
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="calculo" className="space-y-4">
            <h2 id="calculo" className="text-section leading-tight text-evergreen">
              Cómo se calculó
            </h2>
            <div className="grid gap-px overflow-hidden rounded-card border border-ash-grey/60 bg-ash-grey/40 sm:grid-cols-3">
              <CalcCell label={c.tipoContrato === 'ALQUILER' ? 'Canon mensual' : 'Precio acordado'} value={formatPrice(c.precioBase)} />
              <CalcCell label="Regla del acuerdo" value={describeRegla(c.baseCalculo, c.valorRegla)} />
              <CalcCell label="Comisión total" value={formatPrice(c.montoTotal)} strong />
            </div>
            <p className="max-w-[75ch] text-small text-muted-foreground">
              Los valores quedaron congelados el día de la firma. Si el acuerdo comercial cambia después, esta comisión no cambia.
            </p>
          </section>

          <section aria-labelledby="reparto" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="reparto" className="text-section leading-tight text-evergreen">
                {soloLineaAgente ? 'Tu participación' : 'Reparto'}
              </h2>
              {!soloLineaAgente && <p className="text-meta text-muted-foreground">El pago cubre las tres líneas a la vez</p>}
            </div>
            {!soloLineaAgente && c.reparto?.length > 1 && (
              <SplitBar parts={c.reparto.map((r) => ({ tipo: r.beneficiarioTipo, porcentaje: r.porcentaje }))} className="h-2.5" />
            )}
            <div className="overflow-hidden rounded-card border border-ash-grey/60">
              <table className="w-full text-small">
                <thead className="bg-pale-oak/15 text-left text-meta text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Beneficiario
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Porcentaje
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-grey/40">
                  {(c.reparto ?? []).map((r) => (
                    <tr key={r.beneficiarioTipo}>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-3">
                          <BeneficiarioDot tipo={r.beneficiarioTipo} />
                          <span className="min-w-0">
                            <span className="block font-medium text-evergreen">{r.beneficiarioNombre ?? BENEFICIARIO_LABELS[r.beneficiarioTipo]}</span>
                            <span className="block text-meta text-muted-foreground">{BENEFICIARIO_LABELS[r.beneficiarioTipo] ?? r.beneficiarioTipo}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">{formatPorcentaje(r.porcentaje)}</td>
                      <td className={cn('px-5 py-4 text-right font-medium tabular-nums', final ? 'text-ash-grey line-through' : 'text-evergreen')}>{formatPrice(r.monto)}</td>
                    </tr>
                  ))}
                </tbody>
                {!soloLineaAgente && (
                  <tfoot className="border-t border-ash-grey/60 bg-pale-oak/10">
                    <tr>
                      <th scope="row" className="px-5 py-3 text-left font-medium text-evergreen">
                        Total
                      </th>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">100 %</td>
                      <td className="px-5 py-3 text-right font-display font-semibold tabular-nums text-evergreen">{formatPrice(c.montoTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <section aria-labelledby="historial" className="space-y-4">
            <h2 id="historial" className="text-section leading-tight text-evergreen">
              Historial
            </h2>
            <Timeline historial={c.historial ?? []} />
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-card bg-pale-oak/25 p-6">
            <div>
              <p className="text-small text-muted-foreground">{soloLineaAgente ? 'Tu comisión' : 'Comisión total'}</p>
              <p className={cn('mt-1 font-display text-hero font-bold leading-none tabular-nums', final ? 'text-ash-grey line-through' : 'text-evergreen')}>
                {formatPrice(soloLineaAgente ? (lineaAgente?.monto ?? c.montoTotal) : c.montoTotal)}
              </p>
              {soloLineaAgente && lineaAgente && (
                <p className="mt-2 text-small text-muted-foreground">
                  {formatPorcentaje(lineaAgente.porcentaje)} de {formatPrice(c.montoTotal)}
                </p>
              )}
            </div>
            <Actions comision={c} user={user} onDialog={setDialog} />
          </div>

          {c.estado === 'PAGADA' && (
            <dl className="space-y-3 rounded-card border border-success/40 bg-success/[0.05] p-5 text-small">
              <div>
                <dt className="text-meta text-muted-foreground">Referencia de pago</dt>
                <dd className="mt-0.5 font-mono font-medium text-evergreen">{c.referenciaPago ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-meta text-muted-foreground">Pagada</dt>
                <dd className="mt-0.5 font-medium text-evergreen">
                  {formatFechaHora(c.pagadaEn)}
                  {c.pagadaPor && (
                    <span className="block font-normal text-muted-foreground">
                      por <Actor usuarioId={c.pagadaPor} />
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          <dl className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60 text-small">
            <Row
              label="Agente"
              value={
                c.agenteId ? (
                  <Link to={`/agentes/usuario/${c.agenteId}`} className="underline-offset-4 hover:underline">
                    {c.nombreAgente ?? 'Ver perfil'}
                  </Link>
                ) : (
                  c.nombreAgente
                )
              }
            />
            <Row label="Oficina" value={c.nombreOficina} />
            {c.aprobadaEn && (
              <Row
                label="Aprobada"
                value={
                  <>
                    {formatFechaHora(c.aprobadaEn)}
                    {c.aprobadaPor && (
                      <span className="block font-normal text-muted-foreground">
                        por <Actor usuarioId={c.aprobadaPor} />
                      </span>
                    )}
                  </>
                }
              />
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-4">
              {user.rol !== 'GERENTE_OFICINA' && c.contratoId && (
                <Link to={`/panel/contratos/${c.contratoId}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
                  <FileText className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Ver contrato
                </Link>
              )}
              {c.propiedadId && (
                <Link to={`/propiedades/${c.propiedadId}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
                  <House className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Ver propiedad
                </Link>
              )}
              {user.rol !== 'AGENTE' && c.acuerdoId && (
                <Link to={`/panel/acuerdos/${c.acuerdoId}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
                  <Landmark className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Ver acuerdo
                </Link>
              )}
            </div>
          </dl>
        </aside>
      </div>

      {canAprobar(c, user) && (
        <ConfirmDialog
          open={dialog === 'aprobar'}
          onOpenChange={(o) => setDialog(o ? 'aprobar' : null)}
          title="Aprobar comisión"
          description={`¿Aprobar la comisión de ${c.nombreAgente ?? 'este agente'} por ${formatPrice(c.montoTotal)}?`}
          confirmLabel="Aprobar"
          onConfirm={aprobar}
        />
      )}
      {canPagar(c, user) && (
        <PayDialog
          open={dialog === 'pagar'}
          onOpenChange={(o) => setDialog(o ? 'pagar' : null)}
          comision={c}
          onDone={async () => {
            await refresh()
            setNotice(null)
            showToast('Pago registrado')
          }}
          onStale={handleStale}
        />
      )}
      {canRevertir(c, user) && (
        <RevertDialog
          open={dialog === 'revertir'}
          onOpenChange={(o) => setDialog(o ? 'revertir' : null)}
          comision={c}
          onDone={async () => {
            await refresh()
            setNotice(null)
            showToast('Comisión revertida')
          }}
          onStale={handleStale}
        />
      )}
      {toast}
    </div>
  )
}

/** Botones por estado y rol (docs §3). ANULADA, REVERTIDA o cualquier otro caso: ninguno. */
function Actions({ comision: c, user, onDialog }) {
  if (canAprobar(c, user)) {
    return (
      <div className="space-y-2 border-t border-evergreen/10 pt-5">
        <Button className="w-full" onClick={() => onDialog('aprobar')}>
          <Check strokeWidth={1.75} aria-hidden="true" />
          Aprobar
        </Button>
        <p className="text-meta text-muted-foreground">Una vez aprobada, el administrador central podrá registrar el pago.</p>
      </div>
    )
  }
  if (canPagar(c, user)) {
    return (
      <div className="border-t border-evergreen/10 pt-5">
        <Button className="w-full" onClick={() => onDialog('pagar')}>
          Registrar pago
        </Button>
      </div>
    )
  }
  if (canRevertir(c, user)) {
    return (
      <div className="border-t border-evergreen/10 pt-5">
        <Button variant="ghost" className="w-full text-error hover:bg-error/[0.07]" onClick={() => onDialog('revertir')}>
          <Undo2 strokeWidth={1.75} aria-hidden="true" />
          Revertir
        </Button>
      </div>
    )
  }
  return <p className="border-t border-evergreen/10 pt-5 text-small text-muted-foreground">{statusHint(c, user)}</p>
}

function statusHint(c, user) {
  if (c.estado === 'ANULADA') return 'El contrato se canceló antes del pago. Solo se puede consultar.'
  if (c.estado === 'REVERTIDA') return 'El pago se revirtió. Solo se puede consultar.'
  if (c.estado === 'PAGADA') return 'Pagada. Todas las líneas del reparto quedaron saldadas.'
  if (c.estado === 'APROBADA') return 'Aprobada. Falta que el administrador central registre el pago.'
  if (c.estado === 'PENDIENTE' && c.agenteId === user.id && user.rol !== 'AGENTE') return 'No puedes aprobar tu propia comisión.'
  if (c.estado === 'PENDIENTE') return 'Pendiente de aprobación por el gerente de la oficina o el administrador central.'
  return 'Solo se puede consultar.'
}

/** Línea de tiempo del historial, del cambio más antiguo al más reciente. */
function Timeline({ historial }) {
  if (!historial.length) return <p className="text-small text-muted-foreground">Sin cambios registrados.</p>
  return (
    <ol className="relative space-y-6 pl-8 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-ash-grey/60">
      {historial.map((h, i) => (
        <li key={`${h.createdAt}-${i}`} className="relative">
          <span
            className={cn(
              'absolute -left-8 top-1 size-[15px] rounded-full border-2 border-floral-white ring-1',
              i === historial.length - 1 ? 'bg-evergreen ring-evergreen' : 'bg-floral-white ring-ash-grey',
            )}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={ESTADO_COMISION_BADGE[h.estadoNuevo] ?? 'outline'}>{ESTADO_COMISION_LABELS[h.estadoNuevo] ?? h.estadoNuevo}</Badge>
            <time className="text-meta tabular-nums text-muted-foreground">{formatFechaHora(h.createdAt)}</time>
          </div>
          {h.motivo && <p className="mt-1.5 max-w-[75ch] text-small text-evergreen">{h.motivo}</p>}
          <p className="mt-0.5 text-meta text-muted-foreground">{h.usuarioId ? <Actor usuarioId={h.usuarioId} standalone /> : 'Sistema'}</p>
        </li>
      ))}
    </ol>
  )
}

/**
 * Quién hizo un cambio. "Tú" si es la sesión actual; el admin resuelve el nombre con `GET /users/{id}`
 * (solo él tiene acceso); para los demás roles queda un rótulo genérico.
 */
function Actor({ usuarioId, standalone = false }) {
  const { user } = useAuth()
  const self = usuarioId === user.id
  const resolve = user.rol === ADMIN && !self
  const res = useAsync((signal) => (resolve ? getUser(usuarioId, { signal }) : Promise.resolve(null)), [usuarioId, resolve])
  if (self) return standalone ? 'Tú' : 'ti'
  if (resolve && res.loading) return <span className="inline-block h-2.5 w-20 animate-pulse rounded-full bg-pale-oak/40 align-middle" />
  return res.data?.nombre ?? (standalone ? 'Gerente o administrador' : 'un gerente o administrador')
}

function CalcCell({ label, value, strong }) {
  return (
    <div className={cn('space-y-1 px-5 py-4', strong ? 'bg-pale-oak/20' : 'bg-floral-white')}>
      <p className="text-meta text-muted-foreground">{label}</p>
      <p className={cn('tabular-nums text-evergreen', strong ? 'font-display text-subtitle font-semibold' : 'font-medium')}>{value}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="space-y-1 px-5 py-4">
      <dt className="text-meta text-muted-foreground">{label}</dt>
      <dd className="font-medium text-evergreen">{value || '—'}</dd>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/panel/comisiones" className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen">
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Comisiones
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl space-y-8" role="status" aria-label="Cargando comisión">
      <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
      <div className="space-y-3 border-b border-ash-grey/50 pb-6">
        <span className="block h-5 w-24 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-8 w-80 animate-pulse rounded-full bg-pale-oak/40" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <span className="block h-24 animate-pulse rounded-card bg-pale-oak/25" />
          <span className="block h-48 animate-pulse rounded-card bg-pale-oak/20" />
        </div>
        <span className="block h-60 animate-pulse rounded-card bg-pale-oak/25" />
      </div>
    </div>
  )
}
