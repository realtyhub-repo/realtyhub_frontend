import { useState } from 'react'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Foto de perfil si existe y carga; si no, iniciales sobre pale-oak. */
function Avatar({ name, src, className }) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pale-oak font-display text-small font-semibold text-evergreen',
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

export { Avatar }
