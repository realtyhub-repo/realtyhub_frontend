import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Select nativo con el mismo tratamiento que Input (accesible y sin dependencias). */
function Select({ className, children, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <select
        data-slot="select"
        className={cn(
          'h-11 w-full appearance-none rounded-control border border-ash-grey bg-floral-white/60 pl-3 pr-10 text-body text-evergreen transition-[border-color,box-shadow,background-color] duration-200 ease-out',
          'hover:border-emerald-depths/60',
          'focus-visible:border-emerald-depths focus-visible:bg-floral-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-depths/15',
          'aria-invalid:border-error disabled:cursor-not-allowed disabled:opacity-60',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  )
}

export { Select }
