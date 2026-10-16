import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'

/*
 * Calendar de shadcn/ui (react-day-picker v9 + date-fns) re-temado (CLAUDE.md §2, §4 y §6): sin la hoja de
 * estilos por defecto, día seleccionado en evergreen, hoy subrayado en pale-oak, días deshabilitados en
 * ash-grey y radios de control (6px). Semana desde el lunes y textos en español.
 *
 * Modificador opcional `marked` (p. ej. días con visitas): pinta un punto bajo el número.
 */

const dayButton =
  'relative mx-auto flex size-10 items-center justify-center rounded-control text-small tabular-nums text-evergreen transition-colors duration-150 hover:bg-pale-oak/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const navButton =
  'flex size-9 items-center justify-center rounded-control text-evergreen transition-colors duration-150 hover:bg-pale-oak/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:text-ash-grey/60'

/** Punto bajo el número; en el día seleccionado cambia a pale-oak para contrastar con evergreen. */
const markedDay =
  "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-emerald-depths [&>button]:after:content-[''] [&.rdp-selected>button]:after:bg-pale-oak"

function Calendar({ className, classNames, modifiersClassNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={{
        root: 'relative',
        months: 'relative flex flex-col gap-6 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'flex h-9 items-center pl-2 pr-20',
        caption_label: 'font-display text-body font-semibold text-evergreen first-letter:uppercase',
        nav: 'absolute right-0 top-0 z-10 flex items-center gap-1',
        button_previous: navButton,
        button_next: navButton,
        month_grid: 'border-collapse',
        weekdays: '',
        weekday: 'size-10 pb-1 text-center text-meta font-medium text-muted-foreground first-letter:uppercase',
        week: '',
        day: 'p-0 text-center',
        day_button: dayButton,
        selected:
          'rdp-selected [&>button]:bg-evergreen [&>button]:font-medium [&>button]:text-floral-white [&>button]:hover:bg-emerald-depths',
        today:
          '[&>button]:font-semibold [&>button]:underline [&>button]:decoration-pale-oak [&>button]:decoration-2 [&>button]:underline-offset-4',
        outside: '[&>button]:text-ash-grey',
        disabled:
          '[&>button]:cursor-default [&>button]:text-ash-grey/70 [&>button]:no-underline [&>button]:hover:bg-transparent',
        hidden: 'invisible',
        ...classNames,
      }}
      modifiersClassNames={{ marked: markedDay, ...modifiersClassNames }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronRight className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
