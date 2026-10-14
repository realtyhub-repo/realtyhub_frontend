import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Foto de propiedad con relación de aspecto fija y `object-cover` (CLAUDE.md §5).
 * Sin URL (propiedad sin portada, docs §4.1) o si falla la carga: placeholder sobrio, nunca un ícono roto.
 * La relación de aspecto la define quien la usa (`aspect-[4/3]`, `aspect-video`…) en `className`.
 */
export function PropertyPhoto({ src, alt, className, imgClassName, loading = 'lazy', label = 'Sin fotos' }) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed

  return (
    <div className={cn('relative overflow-hidden bg-pale-oak/30', className)}>
      {show ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('size-full object-cover', imgClassName)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-ash-grey" role="img" aria-label={alt}>
          <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-meta">{label}</span>
        </div>
      )}
    </div>
  )
}
