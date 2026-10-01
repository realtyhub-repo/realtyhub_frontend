import { cva } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva('flex gap-3 rounded-control border px-4 py-3 text-small leading-snug', {
  variants: {
    variant: {
      error: 'border-error/40 bg-error/[0.06] text-error',
      success: 'border-success/40 bg-success/[0.07] text-success',
      warning: 'border-warning/50 bg-warning/[0.08] text-[#7a5824]',
      info: 'border-ash-grey bg-pale-oak/20 text-evergreen',
    },
  },
  defaultVariants: { variant: 'info' },
})

const icons = { error: CircleAlert, success: CircleCheck, warning: CircleAlert, info: Info }

function Alert({ variant = 'info', className, children, ...props }) {
  const Icon = icons[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-px size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  )
}

export { Alert }
