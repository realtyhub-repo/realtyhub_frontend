import { CircleAlert, ImagePlus, Star, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { IMAGE_EXTENSIONS, eliminarImagen, fileExtension, marcarPortada, subirImagenes } from '@/api/propertyApi'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACCEPT = IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')
const MIME_OK = new Set(['image/jpeg', 'image/png', 'image/webp'])

let seq = 0
/** Archivo en cola: vista previa local, progreso y estado de la subida. */
function toQueued(file) {
  return { uid: ++seq, file, preview: URL.createObjectURL(file), progress: 0, failed: false }
}

/**
 * Fotos de una propiedad: las publicadas (portada y borrado, docs §4.7) y la cola de nuevas
 * (subida en tres pasos directo a R2, docs §4.6). Las nuevas se agregan al final de la galería,
 * en el orden de la cola. `editable` = dueño o administrador central; si no, solo lectura.
 */
export function PhotoManager({ propiedadId, imagenes = [], editable, onChanged, onToast }) {
  const hasCover = imagenes.some((i) => i.esPortada)
  const [queue, setQueue] = useState([])
  const [coverUid, setCoverUid] = useState(null) // portada elegida dentro de la cola
  const [uploading, setUploading] = useState(false)
  const [rejected, setRejected] = useState([])
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [removing, setRemoving] = useState(null)
  const queueRef = useRef(queue)
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // Liberar las vistas previas al desmontar.
  useEffect(() => () => queueRef.current.forEach((q) => URL.revokeObjectURL(q.preview)), [])

  function addFiles(list) {
    const files = [...list]
    const ok = files.filter((f) => IMAGE_EXTENSIONS.includes(fileExtension(f.name)) && MIME_OK.has(f.type))
    setRejected(files.filter((f) => !ok.includes(f)).map((f) => f.name))
    if (!ok.length) return
    const added = ok.map(toQueued)
    setQueue((q) => [...q, ...added])
    // Sin portada actual: proponer la primera foto nueva (docs §4.6 recomienda marcar una).
    if (!hasCover) setCoverUid((c) => c ?? added[0].uid)
    setError(null)
  }

  function removeQueued(uid) {
    const item = queue.find((x) => x.uid === uid)
    if (item) URL.revokeObjectURL(item.preview)
    const rest = queue.filter((x) => x.uid !== uid)
    setQueue(rest)
    if (coverUid === uid) setCoverUid(!hasCover && rest.length ? rest[0].uid : null)
  }

  async function upload() {
    const batch = queue
    setUploading(true)
    setError(null)
    setQueue((q) => q.map((x) => ({ ...x, progress: 0, failed: false })))
    try {
      const coverIndex = batch.findIndex((x) => x.uid === coverUid)
      const { fallidos } = await subirImagenes(
        propiedadId,
        batch.map((x) => x.file),
        {
          portadaIndex: coverIndex >= 0 ? coverIndex : null,
          onProgress: (i, p) => setQueue((q) => q.map((x) => (x.uid === batch[i].uid ? { ...x, progress: p } : x))),
        },
      )
      const failedUids = new Set(fallidos.map((i) => batch[i].uid))
      batch.filter((x) => !failedUids.has(x.uid)).forEach((x) => URL.revokeObjectURL(x.preview))
      setQueue((q) => q.filter((x) => failedUids.has(x.uid)).map((x) => ({ ...x, failed: true, progress: 0 })))
      if (!failedUids.has(coverUid)) setCoverUid(null)
      const subidas = batch.length - fallidos.length
      onToast(subidas === 1 ? 'Foto subida' : `${subidas} fotos subidas`)
      if (fallidos.length) {
        setError({ mensaje: `${fallidos.length === 1 ? 'Una foto no se pudo subir' : `${fallidos.length} fotos no se pudieron subir`}. Quedaron en la cola para reintentar.` })
      }
      await onChanged()
    } catch (err) {
      setError(err)
      setQueue((q) => q.map((x) => ({ ...x, progress: 0, failed: true })))
    } finally {
      setUploading(false)
    }
  }

  async function makeCover(img) {
    setBusyId(img.id)
    setError(null)
    try {
      await marcarPortada(img.id)
      await onChanged()
      onToast('Portada actualizada')
    } catch (err) {
      setError(err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      {imagenes.length > 0 && !hasCover && (
        <Alert variant="warning">
          <p>Esta propiedad no tiene portada: en el catálogo aparece sin foto. Elige una con "Usar como portada".</p>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <p>{error.status === 403 ? 'Solo el agente a cargo o un administrador central puede cambiar las fotos.' : error.mensaje}</p>
        </Alert>
      )}

      {imagenes.length === 0 && !editable ? (
        <p className="text-muted-foreground">Esta propiedad aún no tiene fotos.</p>
      ) : (
        imagenes.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {imagenes.map((img, i) => (
              <li key={img.id} className="group">
                <div className="relative overflow-hidden rounded-card">
                  <PropertyPhoto src={img.url} alt={`Foto ${i + 1}`} className="aspect-[4/3]" />
                  <span className="absolute left-2 top-2 rounded-full bg-evergreen/85 px-2 py-0.5 text-meta font-medium tabular-nums text-floral-white">{i + 1}</span>
                  {img.esPortada && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-pale-oak px-2.5 py-0.5 text-meta font-medium text-evergreen">
                      <Star className="size-3" strokeWidth={2} aria-hidden="true" />
                      Portada
                    </span>
                  )}
                </div>
                {editable && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {img.esPortada ? (
                      <span className="text-small text-muted-foreground">Foto principal</span>
                    ) : (
                      <Button variant="ghost" size="sm" className="-ml-2 text-small" loading={busyId === img.id} disabled={!!busyId || uploading} onClick={() => makeCover(img)}>
                        {busyId !== img.id && <Star strokeWidth={1.75} aria-hidden="true" />}
                        <span className="sm:hidden">Portada</span>
                        <span className="hidden sm:inline">Usar como portada</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:bg-error/5 hover:text-error"
                      aria-label={`Eliminar foto ${i + 1}`}
                      title="Eliminar foto"
                      disabled={!!busyId || uploading}
                      onClick={() => setRemoving({ ...img, n: i + 1 })}
                    >
                      <Trash2 strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {editable && (
        <div className="space-y-4">
          <DropZone onFiles={addFiles} disabled={uploading} compact={imagenes.length > 0} />

          {rejected.length > 0 && (
            <p className="flex items-start gap-2 text-small text-error">
              <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              No se agregaron {rejected.length === 1 ? `"${rejected[0]}"` : `${rejected.length} archivos`}: solo se aceptan fotos JPG, PNG o WebP.
            </p>
          )}

          {queue.length > 0 && (
            <div className="rounded-card border border-ash-grey/60">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ash-grey/50 px-4 py-3">
                <p className="text-small text-muted-foreground">
                  <span className="font-medium text-evergreen">{queue.length === 1 ? '1 foto lista' : `${queue.length} fotos listas`}</span>
                  {' · '}se agregan al final de la galería en este orden
                </p>
                <Button size="sm" onClick={upload} loading={uploading}>
                  {!uploading && <Upload strokeWidth={1.75} aria-hidden="true" />}
                  {uploading ? 'Subiendo fotos' : queue.length === 1 ? 'Subir foto' : `Subir ${queue.length} fotos`}
                </Button>
              </div>
              <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 xl:grid-cols-4">
                {queue.map((q) => (
                  <QueuedPhoto
                    key={q.uid}
                    item={q}
                    cover={coverUid === q.uid}
                    uploading={uploading}
                    onCover={() => setCoverUid((c) => (c === q.uid ? null : q.uid))}
                    onRemove={() => removeQueued(q.uid)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Eliminar la foto ${removing?.n ?? ''}`}
        description={
          removing?.esPortada
            ? 'Es la portada: la propiedad quedará sin foto principal hasta que elijas otra. Esta acción no se puede deshacer.'
            : 'Se borra de la galería y del almacenamiento. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar foto"
        destructive
        onConfirm={async () => {
          await eliminarImagen(removing.id)
          await onChanged()
          onToast('Foto eliminada')
        }}
      />
    </div>
  )
}

function QueuedPhoto({ item, cover, uploading, onCover, onRemove }) {
  return (
    <li>
      <div className="relative overflow-hidden rounded-control">
        <img src={item.preview} alt={item.file.name} className={cn('aspect-[4/3] w-full object-cover', uploading && 'opacity-70')} />
        {!uploading && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${item.file.name}`}
            className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-evergreen/80 text-floral-white transition-colors duration-150 hover:bg-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pale-oak"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        {uploading && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-evergreen/20" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Subiendo ${item.file.name}`}>
            <div className="h-full bg-evergreen transition-[width] duration-150" style={{ width: `${item.progress * 100}%` }} />
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-meta text-muted-foreground" title={item.file.name}>
        {item.failed ? <span className="text-error">No se subió · {item.file.name}</span> : item.file.name}
      </p>
      <label className={cn('mt-1 flex items-center gap-2 text-small', uploading ? 'text-muted-foreground' : 'cursor-pointer text-evergreen')}>
        <input type="checkbox" checked={cover} onChange={onCover} disabled={uploading} className="size-4 accent-evergreen" />
        Portada
      </label>
    </li>
  )
}

/** Zona para soltar fotos o elegirlas del equipo. */
function DropZone({ onFiles, disabled, compact }) {
  const inputId = useId()
  const [over, setOver] = useState(false)

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!disabled && e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-card border border-dashed px-6 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        compact ? 'py-5' : 'flex-col justify-center py-14 text-center',
        over ? 'border-evergreen bg-pale-oak/25' : 'border-ash-grey hover:border-evergreen/60 hover:bg-pale-oak/10',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-pale-oak/40 text-evergreen', compact ? 'size-10' : 'size-12')}>
        <ImagePlus className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="space-y-0.5">
        <span className="block font-medium text-evergreen">{compact ? 'Agregar más fotos' : 'Agrega las fotos de la propiedad'}</span>
        <span className="block text-small text-muted-foreground">Arrastra los archivos aquí o haz clic para elegirlos. JPG, PNG o WebP.</span>
      </span>
      <input
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </label>
  )
}
