import { CalendarX2, ChevronLeft, Info } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { getAcuerdo } from '@/api/comisionApi'
import { useAuth } from '@/auth/auth-context'
import { CloseAgreementDialog } from '@/components/commission/CloseAgreementDialog'
import { BeneficiarioDot, SplitBar } from '@/components/commission/SplitBar'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { ADMIN, BASE_CALCULO_LABELS, BENEFICIARIO_LABELS, TIPOS_REGLA, acuerdoVigente, comisionErrorInfo, describeRegla, formatFechaCorta, formatPorcentaje, hoyIso } from '@/lib/commission'
import { TIPO_CONTRATO_LABELS, formatFechaHora } from '@/lib/contract'

/**
 * Detalle de un acuerdo comercial (`GET /comisiones/acuerdos/{id}`): una tarjeta por regla con la base de cálculo y
 * el reparto. No se edita; el admin puede cerrarlo (acortar la vigencia) mientras no haya terminado.
 */
export default function AgreementDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [toast, showToast] = useToast()
  const [closing, setClosing] = useState(false)
  const data = useAsync((signal) => getAcuerdo(id, { signal }), [id])
  const a = data.data

  if (data.error && !a) {
    const info = comisionErrorInfo(data.error)
    return (
      <div className="max-w-5xl space-y-6">
        <BackLink />
        {[400, 403, 404].includes(data.error.status) ? (
          <Alert variant="warning">
            <p>{data.error.status === 404 ? 'El acuerdo no existe.' : info.text}</p>
          </Alert>
        ) : (
          <LoadError error={{ ...data.error, mensaje: info.text }} onRetry={data.reload} />
        )}
      </div>
    )
  }
  if (!a) {
    return (
      <div className="max-w-5xl space-y-8" role="status" aria-label="Cargando acuerdo">
        <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-10 w-80 animate-pulse rounded-full bg-pale-oak/40" />
        <div className="grid gap-4 md:grid-cols-2">
          <span className="block h-56 animate-pulse rounded-card bg-pale-oak/25" />
          <span className="block h-56 animate-pulse rounded-card bg-pale-oak/25" />
        </div>
      </div>
    )
  }

  const hoy = hoyIso()
  const vigente = acuerdoVigente(a, hoy)
  const terminado = !!a.vigenteHasta && a.vigenteHasta < hoy
  const canClose = user.rol === ADMIN && !terminado
  const reglas = [...(a.reglas ?? [])].sort((x, y) => TIPOS_REGLA.indexOf(x.tipoContrato) - TIPOS_REGLA.indexOf(y.tipoContrato))

  return (
    <div className="max-w-5xl space-y-8">
      <BackLink />

      <header className="flex flex-col gap-6 border-b border-ash-grey/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          {vigente ? (
            <Badge variant="success" dot>
              Vigente
            </Badge>
          ) : a.vigenteDesde > hoy ? (
            <Badge variant="neutral">Programado</Badge>
          ) : (
            <Badge variant="outline">Cerrado</Badge>
          )}
          <h1 className="text-page leading-tight text-evergreen">{a.nombre}</h1>
          <p className="tabular-nums text-muted-foreground">
            Vigente del {formatFechaCorta(a.vigenteDesde)} {a.vigenteHasta ? `al ${formatFechaCorta(a.vigenteHasta)}` : 'en adelante, sin fecha de fin'}
          </p>
        </div>
        {canClose && (
          <Button variant="outline" onClick={() => setClosing(true)}>
            <CalendarX2 strokeWidth={1.75} aria-hidden="true" />
            Cerrar acuerdo
          </Button>
        )}
      </header>

      {location.state?.created && (
        <Alert variant="success">
          <p>Acuerdo creado. Se aplicará a los contratos que se firmen dentro de su vigencia.</p>
        </Alert>
      )}

      <p className="flex max-w-[75ch] items-start gap-2 text-small text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
        Los acuerdos no se editan. Para cambiar porcentajes, cierra este acuerdo y crea uno nuevo a partir del día siguiente.
      </p>

      <section aria-labelledby="reglas" className="space-y-4">
        <h2 id="reglas" className="text-section leading-tight text-evergreen">
          Reglas por tipo de contrato
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {reglas.map((r) => (
            <li key={r.id ?? r.tipoContrato}>
              <RuleCard regla={r} />
            </li>
          ))}
        </ul>
      </section>

      {a.createdAt && <p className="text-meta text-muted-foreground">Creado el {formatFechaHora(a.createdAt)}</p>}

      {canClose && (
        <CloseAgreementDialog
          open={closing}
          onOpenChange={setClosing}
          acuerdo={a}
          defaultHasta={hoy < a.vigenteDesde ? a.vigenteDesde : hoy}
          onClosed={async (updated) => {
            data.setData(updated ?? (await getAcuerdo(id)))
            showToast('Acuerdo cerrado')
          }}
        />
      )}
      {toast}
    </div>
  )
}

function RuleCard({ regla: r }) {
  const parts = [
    { tipo: 'AGENTE', porcentaje: r.porcentajeAgente },
    { tipo: 'OFICINA', porcentaje: r.porcentajeOficina },
    { tipo: 'CENTRAL', porcentaje: r.porcentajeCentral },
  ]
  return (
    <article className="h-full space-y-5 rounded-card border border-ash-grey/60 p-6">
      <div className="space-y-1">
        <p className="text-small font-medium text-emerald-depths">{TIPO_CONTRATO_LABELS[r.tipoContrato] ?? r.tipoContrato}</p>
        <p className="font-display text-section font-semibold leading-tight text-evergreen">{describeRegla(r.baseCalculo, r.valor)}</p>
        <p className="text-meta text-muted-foreground">{BASE_CALCULO_LABELS[r.baseCalculo] ?? r.baseCalculo}</p>
      </div>
      <div className="space-y-3 border-t border-ash-grey/40 pt-5">
        <SplitBar parts={parts} />
        <dl className="grid grid-cols-3 gap-3">
          {parts.map((p) => (
            <div key={p.tipo} className="space-y-0.5">
              <dt className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <BeneficiarioDot tipo={p.tipo} className="size-2" />
                {BENEFICIARIO_LABELS[p.tipo]}
              </dt>
              <dd className="font-medium tabular-nums text-evergreen">{formatPorcentaje(p.porcentaje)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}

function BackLink() {
  return (
    <Link to="/panel/acuerdos" className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen">
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Acuerdos comerciales
    </Link>
  )
}
