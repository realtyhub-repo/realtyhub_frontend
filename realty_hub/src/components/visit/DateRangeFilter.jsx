import { addDays, isSameDay, startOfDay, subDays } from 'date-fns'
import { CalendarRange, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatDayMonth, formatShortDay, nowInBogota, rangeError } from '@/lib/visit'

/** Rangos rápidos; el primero coincide con el rango por defecto de mis-visitas (hoy → 30 días). */
function presets(now) {
  const today = startOfDay(now)
  return [
    { id: 'proximos-30', label: 'Próximos 30 días', from: today, to: addDays(today, 30) },
    { id: 'proximos-7', label: 'Próximos 7 días', from: today, to: addDays(today, 7) },
    { id: 'proximos-90', label: 'Próximos 90 días', from: today, to: addDays(today, 90) },
    { id: 'ultimos-30', label: 'Últimos 30 días', from: subDays(today, 30), to: today },
  ]
}

const same = (a, b) => isSameDay(a.from, b.from) && isSameDay(a.to, b.to)

/**
 * Selector de rango de días para `desde`/`hasta`. Valida antes de aplicar: con `desde` > `hasta` la API
 * respondería FECHA_INVALIDA (docs/visits-service.md §2).
 */
export function DateRangeFilter({ value, onChange }) {
  const [now] = useState(nowInBogota)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState(null)
  const options = presets(now)
  const preset = options.find((p) => same(p, value))

  function apply(range) {
    const err = rangeError(range)
    setError(err)
    if (err) return
    onChange({ from: startOfDay(range.from), to: startOfDay(range.to) })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setDraft(value)
          setError(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 justify-between gap-3 px-3 text-small sm:min-w-64">
          <span className="flex items-center gap-2">
            <CalendarRange className="text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
            <span className="tabular-nums">
              {preset ? preset.label : `${formatDayMonth(value.from)} – ${formatShortDay(value.to)}`}
            </span>
          </span>
          <ChevronDown className="text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(calc(100vw-32px),720px)] p-0">
        <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">
          <ul className="flex gap-1 overflow-x-auto border-b border-ash-grey/50 p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {options.map((p) => (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => apply(p)}
                  className={cn(
                    'w-full rounded-control px-3 py-2 text-left text-small transition-colors duration-150 hover:bg-pale-oak/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    preset?.id === p.id ? 'bg-pale-oak/35 font-medium text-evergreen' : 'text-evergreen/80',
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-4">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(r) => {
                setDraft(r ?? { from: undefined, to: undefined })
                setError(null)
              }}
              defaultMonth={value.from}
              numberOfMonths={2}
              className="mx-auto"
            />
            <div className="mt-4 flex flex-col gap-3 border-t border-ash-grey/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn('text-small tabular-nums', error ? 'text-error' : 'text-muted-foreground')} aria-live="polite">
                {error ??
                  (draft?.from
                    ? `${formatShortDay(draft.from)} – ${formatShortDay(draft.to ?? draft.from)}`
                    : 'Elige el día de inicio')}
              </p>
              <Button size="sm" onClick={() => apply({ from: draft.from, to: draft.to ?? draft.from })} disabled={!draft?.from}>
                Aplicar rango
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
