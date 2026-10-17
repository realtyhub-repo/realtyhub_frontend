import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * DropdownMenu de shadcn/ui re-temado (CLAUDE.md §4 y §6): misma superficie que el Popover, ítems con
 * hover pale-oak y radio de control. Solo las piezas que usa el panel.
 */

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger

function DropdownMenuContent({ className, align = 'end', sideOffset = 6, ...props }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 rounded-card border border-ash-grey/60 bg-floral-white p-1.5 text-evergreen shadow-brand animate-dialog-in focus:outline-none',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuLabel({ className, ...props }) {
  return <MenuPrimitive.Label className={cn('px-2.5 pb-1 pt-1.5 text-meta font-medium text-muted-foreground', className)} {...props} />
}

function DropdownMenuItem({ className, destructive, ...props }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 text-small outline-none transition-colors duration-150',
        'data-[highlighted]:bg-pale-oak/30 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        destructive ? 'text-error data-[highlighted]:bg-error/[0.07]' : 'text-evergreen',
        className,
      )}
      {...props}
    />
  )
}

/** Ítem que marca la opción actual (p. ej. el estado vigente del lead). */
function DropdownMenuCheckItem({ checked, children, className, ...props }) {
  return (
    <DropdownMenuItem className={cn(checked && 'font-medium', className)} {...props}>
      <span className="flex size-4 items-center justify-center">{checked && <Check strokeWidth={2} aria-hidden="true" />}</span>
      {children}
    </DropdownMenuItem>
  )
}

function DropdownMenuSeparator({ className, ...props }) {
  return <MenuPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-ash-grey/50', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
