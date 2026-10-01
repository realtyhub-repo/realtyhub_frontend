import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn('text-small font-medium text-evergreen', className)}
      {...props}
    />
  )
}

export { Label }
