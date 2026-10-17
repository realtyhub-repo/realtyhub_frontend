import { useState } from 'react'
import { actualizarPrecio } from '@/api/contratoApi'
import { Field } from '@/components/auth/Field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { contratoErrorInfo } from '@/lib/contract'
import { digitsOnly, formatPrice, groupDigits } from '@/lib/property'

/**
 * Editar el precio acordado de un BORRADOR (docs/contratos-service.md §3): se escribe con separadores de miles
 * y se envía solo el número. `onSaved()` debe volver a pedir el detalle, porque `contenido` se regenera.
 * `onStale(info)` cuando el contrato ya no es editable (CONTRATO_NO_EDITABLE).
 */
export function EditPriceDialog({ open, onOpenChange, contrato, onSaved, onStale }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <PriceForm contrato={contrato} onSaved={onSaved} onStale={onStale} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PriceForm({ contrato, onSaved, onStale, onClose }) {
  const initial = Number.isFinite(contrato.precioAcordado) ? String(Math.round(contrato.precioAcordado)) : ''
  const [digits, setDigits] = useState(initial)
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const value = digits ? Number(digits) : 0

  async function submit(e) {
    e.preventDefault()
    if (!(value > 0)) {
      setFieldError('Ingresa un precio mayor que cero')
      return
    }
    if (digits === initial) {
      onClose()
      return
    }
    setPending(true)
    setError(null)
    try {
      await actualizarPrecio(contrato.id, value)
      await onSaved?.()
      onClose()
    } catch (err) {
      const info = contratoErrorInfo(err)
      if (err?.codigo === 'SOLICITUD_INVALIDA') setFieldError(info.text)
      else if (info.reload) {
        onStale?.(info)
        onClose()
      } else setError(info)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Editar precio</DialogTitle>
        <DialogDescription>
          Precio de la propiedad al generar el borrador: {formatPrice(contrato.precioAcordado)}. Al guardar, el texto del contrato se actualiza con el nuevo valor.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6">
        <Field id="precio-acordado" label="Precio acordado" error={fieldError} hint={<p className="text-meta text-muted-foreground">Pesos colombianos, sin decimales.</p>}>
          {(props) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                {...props}
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                placeholder="450.000.000"
                value={groupDigits(digits)}
                onChange={(e) => {
                  setDigits(digitsOnly(e.target.value).replace(/^0+/, '').slice(0, 15))
                  setFieldError(null)
                  setError(null)
                }}
                disabled={pending}
                className="pl-7 font-medium tabular-nums"
              />
            </div>
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
        <Button type="submit" loading={pending}>
          Guardar precio
        </Button>
      </DialogFooter>
    </form>
  )
}
