import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full rounded-control border border-ash-grey bg-floral-white/60 px-3 text-body text-evergreen shadow-[inset_0_1px_1px_rgb(10_59_53/0.04)] transition-[border-color,box-shadow,background-color] duration-200 ease-out',
        'placeholder:text-ash-grey',
        'hover:border-emerald-depths/60',
        'focus-visible:border-emerald-depths focus-visible:bg-floral-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-depths/15',
        'aria-invalid:border-error aria-invalid:focus-visible:ring-error/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
