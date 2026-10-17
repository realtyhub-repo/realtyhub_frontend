import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

/*
 * Popover de shadcn/ui re-temado (CLAUDE.md §4): fondo floral-white, borde ash-grey y la sombra de marca.
 * Radio de tarjeta (12px): flota sobre el contenido pero es más pequeño que un modal.
 */

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverClose = PopoverPrimitive.Close

function PopoverContent({ className, align = 'start', sideOffset = 8, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-card border border-ash-grey/60 bg-floral-white p-4 text-evergreen shadow-brand animate-dialog-in focus:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }
