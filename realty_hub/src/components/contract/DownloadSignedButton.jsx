import { Download } from 'lucide-react'
import { useState } from 'react'
import { getDocumento } from '@/api/contratoApi'
import { Button } from '@/components/ui/button'
import { contratoErrorInfo } from '@/lib/contract'

/**
 * Descarga del PDF firmado (docs/contratos-service.md §7). La URL prefirmada caduca en ~10 minutos, así que se
 * pide en cada clic y se usa de inmediato; nunca se guarda. Se abre por navegación (sin header Authorization).
 *
 * La pestaña se abre de forma síncrona dentro del clic y luego se le asigna la URL: si se abriera después del
 * `await`, el bloqueador de ventanas emergentes podría impedirlo.
 * `onError(info)` recibe { text, reload, retry }; `onDocumento({ version, hashSha256 })` los metadatos sin la URL.
 */
export function DownloadSignedButton({ contratoId, onError, onDocumento, className, size, variant, children = 'Descargar PDF' }) {
  const [pending, setPending] = useState(false)

  async function download() {
    if (pending) return
    const tab = window.open('', '_blank')
    if (tab) {
      tab.opener = null
      try {
        tab.document.title = 'Preparando documento'
        tab.document.body.textContent = 'Preparando el documento…'
      } catch {
        // Algunos navegadores no permiten escribir en la pestaña nueva; solo es un aviso de espera.
      }
    }
    setPending(true)
    try {
      const doc = await getDocumento(contratoId)
      if (!doc?.url) throw new Error('Sin URL')
      onDocumento?.({ version: doc.version, hashSha256: doc.hashSha256 })
      if (tab && !tab.closed) {
        tab.location.replace(doc.url)
      } else {
        // Ventana bloqueada: enlace temporal en una pestaña nueva.
        const a = document.createElement('a')
        a.href = doc.url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
      }
    } catch (err) {
      tab?.close()
      onError?.(err?.codigo || err?.status !== undefined ? contratoErrorInfo(err) : { text: 'No pudimos obtener el documento. Intenta de nuevo.', retry: true })
    } finally {
      setPending(false)
    }
  }

  return (
    <Button onClick={download} loading={pending} className={className} size={size} variant={variant}>
      {!pending && <Download strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </Button>
  )
}
