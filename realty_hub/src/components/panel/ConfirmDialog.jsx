import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Confirmación de una acción. `onConfirm` es async: si lanza, el error se muestra dentro del diálogo
 * y no se cierra. `confirmLabel` repite el verbo de la acción (CLAUDE.md §6).
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, onConfirm }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (pending) return
        if (!v) setError(null)
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <Alert variant="error" className="mt-6">
            <p>{error.mensaje}</p>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
