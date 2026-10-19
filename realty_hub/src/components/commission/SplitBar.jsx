import { BENEFICIARIO_LABELS, BENEFICIARIO_TONO } from '@/lib/commission'
import { cn } from '@/lib/utils'

/**
 * Barra proporcional del reparto agente / oficina / central. `parts`: [{ tipo, porcentaje }].
 * Los tres tonos salen de la paleta (evergreen → emerald-depths → pale-oak), sin acentos ajenos.
 */
export function SplitBar({ parts, className }) {
  const total = parts.reduce((s, p) => s + (Number(p.porcentaje) || 0), 0)
  return (
    <div
      className={cn('flex h-2 gap-0.5 overflow-hidden rounded-full bg-ash-grey/25', className)}
      role="img"
      aria-label={parts.map((p) => `${BENEFICIARIO_LABELS[p.tipo] ?? p.tipo} ${Number(p.porcentaje) || 0} %`).join(', ')}
    >
      {total > 0 &&
        parts.map((p) => (
          <span
            key={p.tipo}
            className={cn('h-full transition-[width] duration-200 first:rounded-l-full last:rounded-r-full', BENEFICIARIO_TONO[p.tipo] ?? 'bg-ash-grey')}
            style={{ width: `${(Math.max(Number(p.porcentaje) || 0, 0) / Math.max(total, 100)) * 100}%` }}
          />
        ))}
    </div>
  )
}

/** Punto de color de un beneficiario, para leyendas y tablas. */
export function BeneficiarioDot({ tipo, className }) {
  return <span className={cn('size-2.5 shrink-0 rounded-full', BENEFICIARIO_TONO[tipo] ?? 'bg-ash-grey', className)} aria-hidden="true" />
}
