import { Label } from '@/components/ui/label'

/**
 * Label + control + mensaje de error/ayuda.
 * `children` es una función que recibe { id, aria-invalid, aria-describedby } para el control.
 */
export function Field({ id, label, error, hint, action, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && <div id={`${id}-hint`}>{hint}</div>}
      {error && (
        <p id={`${id}-error`} className="text-small text-error">
          {error}
        </p>
      )}
    </div>
  )
}
