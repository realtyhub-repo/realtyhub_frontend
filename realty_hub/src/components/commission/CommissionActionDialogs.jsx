import { useState } from 'react'
import { pagarComision, revertirComision } from '@/api/comisionApi'
import { Field } from '@/components/auth/Field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { comisionErrorInfo } from '@/lib/commission'
import { formatPrice } from '@/lib/property'

const REFERENCIA_MAX = 120
const MOTIVO_MAX = 500

/**
 * Registrar pago (docs/comisiones-service.md §5, solo admin): referencia obligatoria. El pago es de la comisión
 * completa. `onDone()` vuelve a pedir el detalle; `onStale(info)` ante un 409 (ya cambió de estado).
 */
export function PayDialog({ open, onOpenChange, comision, onDone, onStale }) {
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar pago"
      description={`Comisión de ${comision.nombreAgente ?? 'el agente'} por ${formatPrice(comision.montoTotal)}. Se marcarán como pagadas todas las líneas del reparto.`}
      field={{ id: 'referencia-pago', label: 'Referencia de pago', placeholder: 'TR-1042', max: REFERENCIA_MAX, hint: 'Número de la transferencia o del comprobante.', emptyError: 'Escribe la referencia de pago' }}
      confirmLabel="Registrar pago"
      submit={(v) => pagarComision(comision.id, v)}
      onDone={onDone}
      onStale={onStale}
    />
  )
}

/** Revertir un pago (docs §6, solo admin, desde PAGADA): motivo obligatorio. Es definitivo. */
export function RevertDialog({ open, onOpenChange, comision, onDone, onStale }) {
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Revertir comisión"
      description="La comisión quedará revertida. Esta acción no se puede deshacer."
      field={{ id: 'motivo-reversion', label: 'Motivo', placeholder: 'Pago duplicado', max: MOTIVO_MAX, multiline: true, emptyError: 'Escribe el motivo de la reversión' }}
      confirmLabel="Revertir comisión"
      destructive
      submit={(v) => revertirComision(comision.id, v)}
      onDone={onDone}
      onStale={onStale}
    />
  )
}

function ActionDialog({ open, onOpenChange, ...props }) {
  const [pending, setPending] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        {open && <ActionForm {...props} pending={pending} setPending={setPending} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ActionForm({ title, description, field, confirmLabel, destructive, submit, onDone, onStale, pending, setPending, onClose }) {
  const [value, setValue] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const Control = field.multiline ? Textarea : Input

  async function handleSubmit(e) {
    e.preventDefault()
    const v = value.trim()
    if (!v) {
      setFieldError(field.emptyError)
      return
    }
    setPending(true)
    setError(null)
    try {
      await submit(v)
      setPending(false)
      await onDone?.()
      onClose()
    } catch (err) {
      setPending(false)
      const info = comisionErrorInfo(err)
      if (info.reload) {
        onStale?.(info)
        onClose()
      } else if (err?.codigo === 'SOLICITUD_INVALIDA') setFieldError(info.text)
      else setError(info)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="max-w-[55ch]">{description}</DialogDescription>
      </DialogHeader>

      <div className="mt-6">
        <Field
          id={field.id}
          label={field.label}
          error={fieldError}
          hint={
            <p className="flex justify-between gap-4 text-meta text-muted-foreground">
              <span>{field.hint}</span>
              <span className="tabular-nums">
                {value.length}/{field.max}
              </span>
            </p>
          }
        >
          {(p) => (
            <Control
              {...p}
              autoFocus
              autoComplete="off"
              maxLength={field.max}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setFieldError(null)
                setError(null)
              }}
              disabled={pending}
              className={field.multiline ? 'min-h-28' : undefined}
            />
          )}
        </Field>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <p>{error.text}</p>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant={destructive ? 'destructive' : 'default'} loading={pending}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
