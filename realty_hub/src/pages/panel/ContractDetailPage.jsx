import { ChevronLeft, Contact, Eye, Fingerprint, House, PencilLine, PenLine, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { cancelarContrato, getContrato, getDocumento } from '@/api/contratoApi'
import { useAuth } from '@/auth/auth-context'
import { ContractCommissionLink } from '@/components/commission/ContractCommissionLink'
import { DownloadSignedButton } from '@/components/contract/DownloadSignedButton'
import { EditPriceDialog } from '@/components/contract/EditPriceDialog'
import { PdfPreviewDialog } from '@/components/contract/PdfPreviewDialog'
import { SignContractDialog } from '@/components/contract/SignContractDialog'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import {
  ESTADO_CONTRATO_BADGE,
  ESTADO_CONTRATO_LABELS,
  ROLES_LISTA_CONTRATOS,
  TIPO_CONTRATO_LABELS,
  canManageContrato,
  contratoErrorInfo,
  formatFechaHora,
  formatFechaLarga,
} from '@/lib/contract'
import { formatPrice } from '@/lib/property'
import { cn } from '@/lib/utils'

/**
 * Detalle de un contrato (`GET /contratos/{id}`, docs/contratos-service.md §2–§7). Las acciones dependen del
 * estado y del rol; tras cada una se vuelve a pedir el detalle (nunca se cambia el estado solo en local).
 */
export default function ContractDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [toast, showToast] = useToast()
  const [dialog, setDialog] = useState(null) // 'precio' | 'firmar' | 'cancelar' | 'vista-previa'
  const [notice, setNotice] = useState(null) // { kind, text, retry? }

  const data = useAsync((signal) => getContrato(id, { signal }), [id])
  const c = data.data
  const manage = canManageContrato(user.rol)

  /** Vuelve a pedir el detalle y lo aplica; los errores de recarga se muestran como aviso. */
  const { setData } = data
  const refresh = useCallback(async () => {
    try {
      setData(await getContrato(id))
    } catch (err) {
      setNotice({ kind: 'error', text: contratoErrorInfo(err).text })
    }
  }, [id, setData])

  /** El servidor dice que el contrato cambió (409): se avisa y se recarga para mostrar el estado real. */
  const handleStale = useCallback(
    (info) => {
      setNotice({ kind: 'warning', text: info?.text ?? 'Este contrato ya cambió de estado.' })
      refresh()
    },
    [refresh],
  )

  if (data.error && !c) {
    const info = contratoErrorInfo(data.error)
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink rol={user.rol} />
        {data.error.status === 404 || data.error.status === 403 || data.error.status === 400 ? (
          <Alert variant="warning">
            <p>{data.error.status === 400 ? 'El enlace del contrato está incompleto.' : info.text}</p>
          </Alert>
        ) : (
          <LoadError error={{ ...data.error, mensaje: info.text }} onRetry={data.reload} />
        )}
      </div>
    )
  }
  if (!c) return <DetailSkeleton />

  const borrador = c.estado === 'BORRADOR'
  const firmado = c.estado === 'FIRMADO'
  const tipo = TIPO_CONTRATO_LABELS[c.tipo] ?? c.tipo
  const fileName = `contrato-${c.tipo?.toLowerCase() ?? 'borrador'}-${c.id.slice(0, 8)}-borrador.pdf`

  async function cancelar() {
    try {
      await cancelarContrato(c.id)
      await refresh()
      setNotice(null)
      showToast('Contrato cancelado')
    } catch (err) {
      const info = contratoErrorInfo(err)
      if (info.reload) refresh()
      throw Object.assign(err, { mensaje: info.text })
    }
  }

  return (
    <div className="max-w-6xl space-y-8">
      <BackLink rol={user.rol} leadId={c.leadId} />

      <header className="flex flex-col gap-6 border-b border-ash-grey/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ESTADO_CONTRATO_BADGE[c.estado] ?? 'outline'} dot>
              {ESTADO_CONTRATO_LABELS[c.estado] ?? c.estado}
            </Badge>
            {borrador && manage && <span className="text-small font-medium text-[#7a5824]">Pendiente de firma</span>}
          </div>
          <h1 className="text-page leading-tight text-evergreen">Contrato de {tipo.toLowerCase()}</h1>
          <p className="text-muted-foreground">
            Creado el {formatFechaLarga(c.createdAt)}
            {firmado && c.firmadoEn && ` · firmado el ${formatFechaHora(c.firmadoEn)}`}
          </p>
        </div>
      </header>

      {notice && (
        <Alert variant={notice.kind}>
          <p>{notice.text}</p>
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="contenido-contrato" className="min-w-0 space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="contenido-contrato" className="text-section leading-tight text-evergreen">
              Texto del contrato
            </h2>
            {c.updatedAt && <p className="text-meta text-muted-foreground">Actualizado el {formatFechaHora(c.updatedAt)}</p>}
          </div>
          <article
            className={cn(
              'relative rounded-card border border-ash-grey/60 bg-floral-white px-6 py-8 sm:px-12 sm:py-12',
              c.estado === 'CANCELADO' && 'opacity-70',
            )}
          >
            {borrador && (
              <p className="mb-8 border-b border-dashed border-ash-grey pb-4 text-small text-muted-foreground">Borrador sin valor legal</p>
            )}
            {c.contenido ? (
              <div className="max-w-[75ch] whitespace-pre-wrap break-words text-body leading-relaxed text-evergreen/90">{c.contenido}</div>
            ) : (
              <p className="text-small text-muted-foreground">El texto del contrato aún no está disponible.</p>
            )}
          </article>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-card bg-pale-oak/25 p-6">
            <div>
              <p className="text-small text-muted-foreground">Precio acordado</p>
              <p className="mt-1 font-display text-hero font-bold leading-none text-evergreen tabular-nums">{formatPrice(c.precioAcordado)}</p>
              {c.tipo === 'ALQUILER' && <p className="mt-1 text-small text-muted-foreground">Canon mensual</p>}
            </div>
            <Actions
              contrato={c}
              manage={manage}
              onDialog={setDialog}
              onDownloadError={(info) => {
                setNotice({ kind: 'error', text: info.text })
                if (info.reload) refresh()
              }}
            />
          </div>

          <dl className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60 text-small">
            <Row label="Cliente" value={c.nombreCliente} />
            <Row
              label="Agente"
              value={
                c.nombreAgente && c.agenteId ? (
                  <Link to={`/agentes/usuario/${c.agenteId}`} className="underline-offset-4 hover:underline">
                    {c.nombreAgente}
                  </Link>
                ) : (
                  c.nombreAgente
                )
              }
            />
            <Row
              label="Propiedad"
              value={
                <>
                  {[c.direccionPropiedad, c.ciudadPropiedad].filter(Boolean).join(', ') || '—'}
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <Link to={`/propiedades/${c.propiedadId}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
                      <House className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Ver propiedad
                    </Link>
                    {user.rol !== 'CLIENTE' && c.leadId && (
                      <Link to={`/panel/leads/${c.leadId}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-depths hover:text-evergreen hover:underline">
                        <Contact className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                        Ver lead
                      </Link>
                    )}
                  </span>
                </>
              }
            />
            <Row label="País" value={c.pais} />
          </dl>

          {firmado && manage && <ContractCommissionLink contrato={c} />}
          {firmado && <DocumentFingerprint contratoId={c.id} />}
        </aside>
      </div>

      {manage && borrador && (
        <>
          <EditPriceDialog
            open={dialog === 'precio'}
            onOpenChange={(o) => setDialog(o ? 'precio' : null)}
            contrato={c}
            onSaved={async () => {
              await refresh()
              showToast('Precio actualizado')
            }}
            onStale={handleStale}
          />
          <SignContractDialog
            open={dialog === 'firmar'}
            onOpenChange={(o) => setDialog(o ? 'firmar' : null)}
            contrato={c}
            onSigned={async () => {
              await refresh()
              setNotice({ kind: 'success', text: 'Contrato firmado. El PDF definitivo ya está disponible para descargar.' })
            }}
            onEditPrice={() => setDialog('precio')}
            onStale={handleStale}
          />
        </>
      )}

      {borrador && (
        <PdfPreviewDialog
          open={dialog === 'vista-previa'}
          onOpenChange={(o) => setDialog(o ? 'vista-previa' : null)}
          contratoId={c.id}
          fileName={fileName}
          onStale={refresh}
        />
      )}

      {manage && (
        <ConfirmDialog
          open={dialog === 'cancelar'}
          onOpenChange={(o) => setDialog(o ? 'cancelar' : null)}
          title="Cancelar contrato"
          description={
            firmado
              ? 'El contrato firmado quedará cancelado. La propiedad volverá a estar disponible. Esta acción no se puede deshacer.'
              : 'El borrador quedará cancelado y ya no se podrá editar ni firmar. Esta acción no se puede deshacer.'
          }
          confirmLabel="Cancelar contrato"
          destructive
          onConfirm={cancelar}
        />
      )}
      {toast}
    </div>
  )
}

/** Botones por estado y rol (docs §2). CANCELADO no tiene ninguno. */
function Actions({ contrato: c, manage, onDialog, onDownloadError }) {
  if (c.estado === 'CANCELADO') {
    return <p className="border-t border-evergreen/10 pt-5 text-small text-muted-foreground">Este contrato está cancelado. Solo se puede consultar.</p>
  }
  const borrador = c.estado === 'BORRADOR'
  return (
    <div className="space-y-2 border-t border-evergreen/10 pt-5">
      {borrador && manage && (
        <Button className="w-full" onClick={() => onDialog('firmar')}>
          <PenLine strokeWidth={1.75} aria-hidden="true" />
          Firmar
        </Button>
      )}
      {c.estado === 'FIRMADO' && <DownloadSignedButton contratoId={c.id} className="w-full" onError={onDownloadError} />}
      {borrador && (
        <Button variant="outline" className="w-full" onClick={() => onDialog('vista-previa')}>
          <Eye strokeWidth={1.75} aria-hidden="true" />
          Ver vista previa
        </Button>
      )}
      {borrador && manage && (
        <Button variant="outline" className="w-full" onClick={() => onDialog('precio')}>
          <PencilLine strokeWidth={1.75} aria-hidden="true" />
          Editar precio
        </Button>
      )}
      {manage && (
        <Button variant="ghost" className="w-full text-error hover:bg-error/[0.07]" onClick={() => onDialog('cancelar')}>
          <X strokeWidth={1.75} aria-hidden="true" />
          Cancelar
        </Button>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="space-y-1 px-5 py-4">
      <dt className="text-meta text-muted-foreground">{label}</dt>
      <dd className="font-medium text-evergreen">{value || '—'}</dd>
    </div>
  )
}

/**
 * Huella del documento firmado (SHA-256), para quien quiera verificar la integridad. Se pide solo al abrir el
 * detalle técnico; de la respuesta se usan versión y hash, nunca se guarda la URL prefirmada.
 */
function DocumentFingerprint({ contratoId }) {
  const [open, setOpen] = useState(false)
  const doc = useAsync(
    async (signal) => {
      if (!open) return null
      const { version, hashSha256 } = await getDocumento(contratoId, { signal })
      return { version, hashSha256 }
    },
    [contratoId, open],
  )
  return (
    <details className="group rounded-card border border-ash-grey/60" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-small font-medium text-evergreen [&::-webkit-details-marker]:hidden">
        <Fingerprint className="size-4 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
        Huella del documento
        <span className="ml-auto text-meta font-normal text-muted-foreground group-open:hidden">Ver detalle técnico</span>
      </summary>
      <div className="space-y-2 border-t border-ash-grey/40 px-5 py-4 text-small">
        {doc.loading ? (
          <span className="block h-10 animate-pulse rounded-control bg-pale-oak/30" />
        ) : doc.error ? (
          <p className="text-muted-foreground">
            {contratoErrorInfo(doc.error).text}{' '}
            <button type="button" onClick={doc.reload} className="font-medium text-emerald-depths hover:underline">
              Reintentar
            </button>
          </p>
        ) : doc.data ? (
          <>
            <p className="text-muted-foreground">SHA-256 · versión {doc.data.version ?? '—'}</p>
            <code className="block break-all rounded-control bg-pale-oak/20 px-3 py-2 font-mono text-meta text-evergreen">{doc.data.hashSha256 ?? '—'}</code>
          </>
        ) : null}
      </div>
    </details>
  )
}

function BackLink({ rol, leadId }) {
  const toLead = !ROLES_LISTA_CONTRATOS.includes(rol) && leadId
  return (
    <Link
      to={toLead ? `/panel/leads/${leadId}` : ROLES_LISTA_CONTRATOS.includes(rol) ? '/panel/contratos' : '/panel'}
      className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen"
    >
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      {toLead ? 'Volver al lead' : ROLES_LISTA_CONTRATOS.includes(rol) ? 'Contratos' : 'Panel'}
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl space-y-8" role="status" aria-label="Cargando contrato">
      <span className="block h-4 w-32 animate-pulse rounded-full bg-pale-oak/40" />
      <div className="space-y-3 border-b border-ash-grey/50 pb-6">
        <span className="block h-5 w-24 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-8 w-80 animate-pulse rounded-full bg-pale-oak/40" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3 rounded-card border border-ash-grey/50 p-12">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={cn('block h-3 animate-pulse rounded-full bg-pale-oak/30', i % 4 === 3 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
        <span className="block h-72 animate-pulse rounded-card bg-pale-oak/25" />
      </div>
    </div>
  )
}
