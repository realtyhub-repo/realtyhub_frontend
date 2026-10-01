import { Check } from 'lucide-react'
import { PASSWORD_RULES } from '@/api/authApi'
import { cn } from '@/lib/utils'

/** Feedback inmediato de las reglas del servidor: ^(?=.*[A-Z])(?=.*[0-9]).{8,}$ */
export function PasswordChecklist({ value }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-meta" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value)
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-150',
              ok ? 'text-success' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-3.5 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-200',
                ok ? 'scale-110 border-success bg-success text-floral-white' : 'border-ash-grey',
              )}
              aria-hidden="true"
            >
              {ok && <Check className="size-2.5 animate-pop" strokeWidth={3} />}
            </span>
            {rule.label}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
