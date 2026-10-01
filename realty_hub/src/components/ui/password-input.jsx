import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-ash-grey transition-colors duration-150 hover:text-evergreen focus-visible:text-evergreen focus-visible:outline-none"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}

export { PasswordInput }
