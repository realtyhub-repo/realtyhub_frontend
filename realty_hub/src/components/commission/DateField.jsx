import { CalendarDays, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatFechaCorta, parseIsoDate, toIsoDate } from '@/lib/commission'
import { cn } from '@/lib/utils'

/**
 * Selector de un día (`AAAA-MM-DD`) para vigencias de acuerdos. `onClear` muestra "Quitar fecha" (fecha opcional).
 * `disabled` es un matcher de react-day-picker (p. ej. { before: fecha }). Recibe los props de `Field`.
 */
export function DateField({ value, onChange, onClear, disabled, placeholder = 'Elige un día', className, ...props }) {
  const [open, setOpen] = useState(false)
  const selected = parseIsoDate(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-11 w-full justify-between gap-3 bg-floral-white/60 px-3 font-normal aria-invalid:border-error', className)}
          {...props}
        >
          <span className={cn('flex items-center gap-2 tabular-nums', !selected && 'text-ash-grey')}>
            <CalendarDays className="text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
            {selected ? formatFechaCorta(value) : placeholder}
          </span>
          <ChevronDown className="text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          defaultMonth={selected ?? undefined}
          disabled={disabled}
          onSelect={(d) => {
            if (!d) return
            onChange(toIsoDate(d))
            setOpen(false)
          }}
        />
        {onClear && (
          <div className="mt-3 border-t border-ash-grey/40 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
            >
              Quitar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
