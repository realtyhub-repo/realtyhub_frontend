import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Páginas visibles alrededor de la actual, con huecos ("…") cuando hay muchas. `page` va desde 0. */
function pageItems(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const set = new Set([0, total - 1, page - 1, page, page + 1].filter((i) => i >= 0 && i < total))
  const sorted = [...set].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap-' + p, p] : [p]))
}

const item =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-control px-3 text-small font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

/** Paginación numerada (paginación de Spring, base 0). No se muestra si hay una sola página. */
export function Pagination({ page, totalPages, onChange, className }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <nav aria-label="Paginación" className={cn('flex items-center justify-center gap-1', className)}>
      <button type="button" className={cn(item, 'text-evergreen hover:bg-pale-oak/30')} onClick={() => onChange(page - 1)} disabled={page <= 0}>
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Anterior</span>
      </button>
      <ul className="flex items-center gap-1">
        {pageItems(page, totalPages).map((p) =>
          typeof p === 'string' ? (
            <li key={p} className="px-1 text-ash-grey" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p + 1}`}
                className={cn(item, p === page ? 'bg-evergreen text-floral-white' : 'text-evergreen hover:bg-pale-oak/30')}
              >
                {p + 1}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className={cn(item, 'text-evergreen hover:bg-pale-oak/30')}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        <span className="sr-only sm:not-sr-only">Siguiente</span>
        <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </nav>
  )
}
