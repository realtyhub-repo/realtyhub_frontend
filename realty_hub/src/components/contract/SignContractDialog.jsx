import { PenLine, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { firmarContrato } from '@/api/contratoApi'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TIPO_CONTRATO_LABELS, contratoErrorInfo } from '@/lib/contract'
import { formatPrice } from '@/lib/property'

/**
 * Confirmación de firma (docs/contratos-service.md §5): resumen de partes, propiedad y precio. Firmar genera el
 * PDF definitivo y lo sube a almacenamiento, así que puede tardar: se muestra progreso y no se puede cerrar
 * mientras tanto. Ante PDF_NO_GENERADO / ALMACENAMIENTO_NO_DISPONIBLE el contrato sigue en borrador y se reintenta.
 * `onSigned()` vuelve a pedir el detalle; `onEditPrice()` ante PRECIO_REQUERIDO; `onStale(info)` si cambió de estado.
 */
export function SignContractDialog({ open, onOpenChange, contrato, onSigned, onEditPrice, onStale }) {
  const [pending, setPending] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="max-w-lg" hideClose={pending} onEscapeKeyDown={(e) => pending && e.preventDefault()} onPointerDownOutside={(e) => pending && e.preventDefault()}>
        {open && (
          <SignBody
            contrato={contrato}
            pending={pending}
            setPending={setPending}
            onSigned={onSigned}
            onEditPrice={onEditPrice}
            onStale={onStale}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SignBody({ contrato: c, pending, setPending, onSigned, onEditPrice, onStale, onClose }) {
  const [error, setError] = useState(null)

  async function sign() {
    setPending(true)
    setError(null)
    try {
      await firmarContrato(c.id)
      setPending(false)
      await onSigned?.()
      onClose()
    } catch (err) {
      setPending(false)
      const info = contratoErrorInfo(err)
      if (info.reload) {
        onStale?.(info)
        onClose()
      } else setError({ ...info, precio: err?.codigo === 'PRECIO_REQUERIDO' })
    }
  }

  const resumen = [
    ['Tipo', TIPO_CONTRATO_LABELS[c.tipo] ?? c.tipo],
    ['Cliente', c.nombreCliente || '—'],
    ['Agente', c.nombreAgente || '—'],
    ['Propiedad', [c.direccionPropiedad, c.ciudadPropiedad].filter(Boolean).join(', ') || '—'],
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle>Firmar contrato</DialogTitle>
        <DialogDescription className="max-w-[55ch]">
          Al firmar se genera el PDF definitivo y la propiedad pasará a {c.tipo === 'ALQUILER' ? 'alquilada' : 'vendida'}. Esta acción no se puede
          deshacer, aunque el contrato puede cancelarse después.
        </DialogDescription>
      </DialogHeader>

      <dl className="mt-6 divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60">
        {resumen.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-6 px-4 py-3 text-small">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium text-evergreen">{v}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-6 bg-pale-oak/20 px-4 py-4">
          <dt className="text-small text-muted-foreground">Precio acordado</dt>
          <dd className="font-display text-subtitle font-semibold text-evergreen tabular-nums">{formatPrice(c.precioAcordado)}</dd>
        </div>
      </dl>

      {pending && (
        <div className="mt-6 space-y-2" role="status">
          <div className="h-1 overflow-hidden rounded-full bg-pale-oak/40">
            <div className="h-full w-1/3 animate-progress rounded-full bg-emerald-depths" />
          </div>
          <p className="text-small text-muted-foreground">Generando y guardando el PDF firmado. Puede tardar unos segundos.</p>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          <p>{error.text}</p>
          {error.precio && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onEditPrice?.()
              }}
            >
              Editar precio
            </Button>
          )}
        </Alert>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Volver
        </Button>
        <Button onClick={sign} loading={pending} disabled={error?.precio}>
          {!pending && (error?.retry ? <RotateCw strokeWidth={1.75} aria-hidden="true" /> : <PenLine strokeWidth={1.75} aria-hidden="true" />)}
          {error?.retry ? 'Reintentar firma' : 'Firmar contrato'}
        </Button>
      </DialogFooter>
    </>
  )
}
