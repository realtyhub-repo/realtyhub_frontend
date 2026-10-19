import { ChevronRight, Coins, RotateCw } from 'lucide-react'
import { Link } from 'react-router'
import { listComisiones } from '@/api/comisionApi'
import { useAuth } from '@/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/useAsync'
import { ESTADO_COMISION_BADGE, ESTADO_COMISION_LABELS, comisionErrorInfo, montoPrincipal } from '@/lib/commission'
import { formatPrice } from '@/lib/property'

/**
 * "Ver comisión" desde un contrato FIRMADO (docs/comisiones-service.md §Cómo conectar con Contratos). No hay
 * endpoint por contrato: se pide la lista del día de la firma y se busca por `contratoId`. Si aún no aparece, la
 * comisión se está generando (es asíncrona).
 */
export function ContractCommissionLink({ contrato }) {
  const { user } = useAuth()
  const dia = contrato.firmadoEn?.slice(0, 10)
  const result = useAsync(
    async (signal) => {
      const page = await listComisiones({ desde: dia, hasta: dia, tamanio: 100, signal })
      return page?.contenido?.find((c) => c.contratoId === contrato.id) ?? null
    },
    [contrato.id, dia],
  )
  const c = result.data

  return (
    <div className="rounded-card border border-ash-grey/60">
      <p className="flex items-center gap-2 px-5 pt-4 text-small font-medium text-evergreen">
        <Coins className="size-4 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
        Comisión
      </p>
      {result.loading ? (
        <span className="mx-5 my-4 block h-10 animate-pulse rounded-control bg-pale-oak/30" />
      ) : c ? (
        <Link
          to={`/panel/comisiones/${c.id}`}
          className="group flex items-center gap-3 px-5 pb-4 pt-3 transition-colors duration-150 hover:bg-pale-oak/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <Badge variant={ESTADO_COMISION_BADGE[c.estado] ?? 'outline'} dot>
              {ESTADO_COMISION_LABELS[c.estado] ?? c.estado}
            </Badge>
            <p className="font-display text-subtitle font-semibold tabular-nums text-evergreen">{formatPrice(montoPrincipal(c, user.rol).monto)}</p>
          </div>
          <span className="text-small font-medium text-emerald-depths group-hover:text-evergreen">Ver comisión</span>
          <ChevronRight className="size-4 text-ash-grey group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : (
        <div className="space-y-2 px-5 pb-4 pt-2 text-small text-muted-foreground">
          <p>{result.error ? comisionErrorInfo(result.error).text : 'La comisión se está generando.'}</p>
          <button type="button" onClick={result.reload} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
            <RotateCw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      )}
    </div>
  )
}
