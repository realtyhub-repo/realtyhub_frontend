import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-sans text-body font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-evergreen text-floral-white hover:bg-emerald-depths',
        outline: 'border border-ash-grey bg-transparent text-evergreen hover:border-evergreen hover:bg-pale-oak/25',
        ghost: 'text-evergreen hover:bg-pale-oak/30',
        link: 'h-auto px-0 text-emerald-depths underline-offset-4 hover:text-evergreen hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

// oxlint-disable-next-line react/only-export-components -- patrón estándar de shadcn
export { Button, buttonVariants }
