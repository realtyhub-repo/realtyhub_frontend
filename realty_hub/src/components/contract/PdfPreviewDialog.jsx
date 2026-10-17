import { Download, FileWarning, LoaderCircle, RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import { getVistaPrevia } from '@/api/contratoApi'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAsync } from '@/hooks/useAsync'
import { contratoErrorInfo } from '@/lib/contract'

/**
 * Vista previa del borrador en PDF (docs/contratos-service.md §4). La ruta exige el token, así que el PDF se
 * descarga con `fetch` + Authorization, se muestra desde una URL de blob y esa URL se libera al cerrar.
 * Si el contrato ya no es borrador (DOCUMENTO_NO_DISPONIBLE) se avisa y se pide recargar el detalle con `onStale`.
 */
export function PdfPreviewDialog({ open, onOpenChange, contratoId, fileName, onStale }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92svh,1000px)] max-w-5xl flex-col gap-0 p-0 sm:p-0">
        {open && <PreviewBody contratoId={contratoId} fileName={fileName} onStale={onStale} />}
      </DialogContent>
    </Dialog>
  )
}

/** Montado solo con el diálogo abierto: al cerrarlo se aborta la descarga y se libera la URL del blob. */
function PreviewBody({ contratoId, fileName, onStale }) {
  const pdf = useAsync(
    (signal) =>
      getVistaPrevia(contratoId, { signal }).then((blob) => {
        // Si se cerró el visor mientras llegaba el PDF no se crea la URL (no habría quién la liberara).
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        return { url: URL.createObjectURL(blob) }
      }),
    [contratoId],
  )
  const url = pdf.data?.url ?? null
  // Cada URL de blob se libera cuando se reemplaza (reintento) o al cerrar el visor.
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url])
  const info = pdf.error ? contratoErrorInfo(pdf.error) : null

  useEffect(() => {
    if (info?.reload) onStale?.()
  }, [info?.reload, onStale])

  return (
    <>
      <DialogHeader className="flex flex-col gap-4 border-b border-ash-grey/50 px-6 py-5 pr-14 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <DialogTitle>Vista previa del borrador</DialogTitle>
          <DialogDescription>Documento sin valor legal. No se guarda: se genera cada vez que lo abres.</DialogDescription>
        </div>
        {url && (
          <a href={url} download={fileName} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'shrink-0' })}>
            <Download strokeWidth={1.75} aria-hidden="true" />
            Descargar PDF
          </a>
        )}
      </DialogHeader>

      <div className="relative min-h-0 flex-1 bg-pale-oak/15">
        {pdf.loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-small text-muted-foreground" role="status">
            <LoaderCircle className="size-6 animate-spin text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
            Generando la vista previa…
          </div>
        ) : info ? (
          <div className="flex h-full items-center justify-center p-6">
            <Alert variant="error" className="max-w-md">
              <p>{info.text}</p>
              {!info.reload && (
                <Button variant="outline" size="sm" onClick={pdf.reload}>
                  <RotateCw strokeWidth={1.75} aria-hidden="true" />
                  Reintentar
                </Button>
              )}
            </Alert>
          </div>
        ) : url ? (
          // <object> muestra su contenido alternativo en navegadores sin visor de PDF integrado (la mayoría en móvil).
          <object data={url} type="application/pdf" aria-label="Vista previa del contrato" className="size-full rounded-b-modal">
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <FileWarning className="size-8 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />
              <p className="max-w-[40ch] text-small text-muted-foreground">Tu navegador no puede mostrar el PDF aquí. Descárgalo para revisarlo.</p>
              <a href={url} download={fileName} className={buttonVariants({ size: 'sm' })}>
                <Download strokeWidth={1.75} aria-hidden="true" />
                Descargar PDF
              </a>
            </div>
          </object>
        ) : null}
      </div>
    </>
  )
}
