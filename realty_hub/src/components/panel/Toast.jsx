import { CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/** Aviso breve de éxito tras una mutación ("Rol actualizado"). Uno a la vez, se oculta solo. */
export function useToast() {
  const [message, setMessage] = useState(null)
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(id)
  }, [message])
  const show = useCallback((text) => setMessage({ text, key: Date.now() }), [])
  const node = message ? (
    <div
      key={message.key}
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 animate-alert-in items-center gap-2 rounded-control bg-evergreen px-4 py-3 text-small text-floral-white shadow-brand"
    >
      <CircleCheck className="size-[18px] text-pale-oak" strokeWidth={1.75} aria-hidden="true" />
      {message.text}
    </div>
  ) : null
  return [node, show]
}
