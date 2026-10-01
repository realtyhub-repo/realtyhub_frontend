import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/* Estado por color + peso, nunca por mayúsculas (CLAUDE.md §3). */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-meta font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-pale-oak/45 text-evergreen',
        outline: 'border border-ash-grey text-muted-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/12 text-[#7a5824]',
        error: 'bg-error/10 text-error',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

function Badge({ variant, dot = false, className, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

export { Badge }
