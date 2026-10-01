import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Dialog de shadcn/ui re-temado (CLAUDE.md §4 y §6): overlay teñido de evergreen en vez de negro,
 * radio de modal (16px, flota sobre todo lo demás) y la sombra de marca.
 * `side="left"` lo convierte en panel lateral (menú del panel en móvil).
 */

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-evergreen/40 backdrop-blur-[2px] animate-overlay-in', className)}
      {...props}
    />
  )
}

const sides = {
  center:
    'left-1/2 top-1/2 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-modal border border-ash-grey/60 bg-floral-white p-6 shadow-brand animate-dialog-in sm:p-8',
  left: 'inset-y-0 left-0 h-full w-[min(85vw,300px)] animate-sheet-in',
}

function DialogContent({ className, children, side = 'center', hideClose = false, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn('fixed z-50 focus:outline-none', sides[side], className)}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-control text-ash-grey transition-colors duration-150 hover:bg-pale-oak/30 hover:text-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar"
          >
            <X className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }) {
  return <div className={cn('space-y-2 pr-8', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return <div className={cn('mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn('font-display text-subtitle font-semibold leading-tight text-evergreen', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description className={cn('text-small text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
