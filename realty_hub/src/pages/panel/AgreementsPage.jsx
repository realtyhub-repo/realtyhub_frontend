import { ChevronLeft, ChevronRight, Landmark, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { listAcuerdos } from '@/api/comisionApi'
import { useAuth } from '@/auth/auth-context'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, LoadError } from '@/components/panel/States'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { ADMIN, TIPOS_REGLA, acuerdoVigente, comisionErrorInfo, describeRegla, formatFechaCorta, hoyIso } from '@/lib/commission'
import { TIPO_CONTRATO_LABELS } from '@/lib/contract'
import { cn } from '@/lib/utils'

/**
 * Acuerdos comerciales (docs/comisiones-service.md §7): las reglas con las que se calcula cada comisión. El admin
 * crea y cierra; el gerente solo consulta. Si hoy no hay ninguno vigente, se avisa: los contratos que se firmen
 * no generarán comisión.
 */
export default function AgreementsPage() {
  const { user } = useAuth()
  const admin = user.rol === ADMIN
  const result = useAsync((signal) => listAcuerdos({ signal }), [])
  const acuerdos = result.data ?? []
  const hoy = hoyIso()
  const vigente = acuerdos.find((a) => acuerdoVigente(a, hoy))

  return (
    <div className="max-w-5xl space-y-6">
      <Link to="/panel/comisiones" className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen">
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Comisiones
      </Link>

      <PageHeader
        title="Acuerdos comerciales"
        description="Definen cuánto se cobra por cada tipo de contrato y cómo se reparte entre agente, oficina y central. Se aplica el acuerdo vigente el día de la firma."
        actions={
          admin && (
            <Button asChild>
              <Link to="/panel/acuerdos/nuevo">
                <Plus strokeWidth={1.75} aria-hidden="true" />
                Crear acuerdo
              </Link>
            </Button>
          )
        }
      />

      {result.data && !vigente && (
        <Alert variant="warning">
          <p>No hay acuerdo comercial vigente. Los contratos que se firmen hoy no generarán comisión.</p>
          {admin && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/panel/acuerdos/nuevo">Crear acuerdo</Link>
            </Button>
          )}
        </Alert>
      )}

      {result.error && !result.data ? (
        <LoadError error={{ ...result.error, mensaje: comisionErrorInfo(result.error).text }} onRetry={result.reload} />
      ) : result.loading && !result.data ? (
        <Skeleton />
      ) : acuerdos.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Aún no hay acuerdos comerciales"
          text={admin ? 'Crea el primero para que los contratos firmados generen comisión.' : 'El administrador central los crea.'}
        />
      ) : (
        <ul className="space-y-3">
          {acuerdos.map((a) => (
            <li key={a.id}>
              <AgreementRow acuerdo={a} vigente={a.id === vigente?.id} futuro={a.vigenteDesde > hoy} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AgreementRow({ acuerdo: a, vigente, futuro }) {
  const reglas = [...(a.reglas ?? [])].sort((x, y) => TIPOS_REGLA.indexOf(x.tipoContrato) - TIPOS_REGLA.indexOf(y.tipoContrato))
  return (
    <Link
      to={`/panel/acuerdos/${a.id}`}
      className={cn(
        'group flex items-center gap-5 rounded-card border p-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        vigente ? 'border-emerald-depths/50 bg-emerald-depths/[0.04] hover:border-emerald-depths' : 'border-ash-grey/60 hover:border-ash-grey hover:bg-pale-oak/10',
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-subtitle font-semibold leading-tight text-evergreen">{a.nombre}</h2>
          {vigente && (
            <Badge variant="success" dot>
              Vigente
            </Badge>
          )}
          {futuro && <Badge variant="neutral">Programado</Badge>}
          {!vigente && !futuro && <Badge variant="outline">Cerrado</Badge>}
        </div>
        <p className="text-small tabular-nums text-muted-foreground">
          {formatFechaCorta(a.vigenteDesde)} – {a.vigenteHasta ? formatFechaCorta(a.vigenteHasta) : 'Sin fecha de fin'}
        </p>
        {reglas.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-small">
            {reglas.map((r) => (
              <li key={r.tipoContrato} className="text-evergreen">
                <span className="text-muted-foreground">{TIPO_CONTRATO_LABELS[r.tipoContrato] ?? r.tipoContrato}:</span> {describeRegla(r.baseCalculo, r.valor)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
    </Link>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando acuerdos">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-card border border-ash-grey/50 p-5">
          <span className="block h-5 w-48 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="block h-3 w-40 animate-pulse rounded-full bg-pale-oak/30" />
          <span className="block h-3 w-72 animate-pulse rounded-full bg-pale-oak/25" />
        </div>
      ))}
    </div>
  )
}
