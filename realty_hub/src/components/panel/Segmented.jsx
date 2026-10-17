import { cn } from '@/lib/utils'

/**
 * Control segmentado para filtros cortos y excluyentes (estado de visita, pipeline / finalizados).
 * `options`: [{ value, label, count? }]. Accesible como grupo de radios.
 */
export function Segmented({ label, options, value, onChange, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-control border border-ash-grey/70 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value || 'todos'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-2 rounded-[4px] px-3 text-small font-medium transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-evergreen text-floral-white' : 'text-muted-foreground hover:bg-pale-oak/25 hover:text-evergreen',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('text-meta tabular-nums', active ? 'text-floral-white/70' : 'text-ash-grey')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
