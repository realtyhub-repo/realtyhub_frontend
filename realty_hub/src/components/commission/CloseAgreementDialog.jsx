import { useState } from 'react'
import { cerrarAcuerdo } from '@/api/comisionApi'
import { Field } from '@/components/auth/Field'
import { DateField } from '@/components/commission/DateField'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { comisionErrorInfo, formatFechaCorta, parseIsoDate } from '@/lib/commission'

/**
 * Cerrar un acuerdo (docs/comisiones-service.md §7): fija `vigenteHasta`. Solo puede acortar la vigencia y nunca
 * quedar antes de `vigenteDesde`. `defaultHasta` propone la fecha (p. ej. el día anterior al nuevo acuerdo).
 * `onClosed(acuerdo)` recibe la respuesta del servidor.
 */
export function CloseAgreementDialog({ open, onOpenChange, acuerdo, defaultHasta, onClosed }) {
  const [pending, setPending] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        {open && (
          <CloseForm acuerdo={acuerdo} defaultHasta={defaultHasta} onClosed={onClosed} pending={pending} setPending={setPending} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CloseForm({ acuerdo: a, defaultHasta, onClosed, pending, setPending, onClose }) {
  const [hasta, setHasta] = useState(defaultHasta ?? '')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const min = parseIsoDate(a.vigenteDesde)
  const max = parseIsoDate(a.vigenteHasta)

  async function submit(e) {
    e.preventDefault()
    if (!hasta) return setFieldError('Elige el último día de vigencia')
    if (hasta < a.vigenteDesde) return setFieldError('No puede ser anterior al inicio de la vigencia')
    if (a.vigenteHasta && hasta > a.vigenteHasta) return setFieldError('Solo se puede acortar la vigencia, no ampliarla')
    setPending(true)
    setError(null)
    try {
      const updated = await cerrarAcuerdo(a.id, hasta)
      setPending(false)
      await onClosed?.(updated)
      onClose()
    } catch (err) {
      setPending(false)
      setError(comisionErrorInfo(err))
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Cerrar acuerdo</DialogTitle>
        <DialogDescription className="max-w-[55ch]">
          «{a.nombre}» dejará de aplicarse después del día que elijas. Las comisiones ya calculadas no cambian. Desde ese día hará falta otro acuerdo para que
          los contratos firmados generen comisión.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6">
        <Field
          id="cerrar-hasta"
          label="Último día de vigencia"
          error={fieldError}
          hint={
            <p className="text-meta text-muted-foreground">
              Vigente desde el {formatFechaCorta(a.vigenteDesde)}
              {a.vigenteHasta ? ` hasta el ${formatFechaCorta(a.vigenteHasta)}` : ', sin fecha de fin'}.
            </p>
          }
        >
          {(p) => (
            <DateField
              {...p}
              value={hasta}
              onChange={(v) => {
                setHasta(v)
                setFieldError(null)
              }}
              disabled={[{ before: min }, ...(max ? [{ after: max }] : [])]}
              aria-invalid={fieldError ? true : undefined}
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
        <Button type="submit" loading={pending}>
          Cerrar acuerdo
        </Button>
      </DialogFooter>
    </form>
  )
}
