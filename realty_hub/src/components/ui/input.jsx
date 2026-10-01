import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full rounded-control border border-ash-grey bg-floral-white px-3 text-body text-evergreen transition-colors duration-150',
        'placeholder:text-ash-grey',
        'hover:border-emerald-depths/60',
        'focus-visible:border-emerald-depths focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-depths/25',
        'aria-invalid:border-error aria-invalid:focus-visible:ring-error/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
