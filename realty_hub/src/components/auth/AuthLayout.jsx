import { Building, House, Users } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { FacadeIllustration } from './FacadeIllustration'

const CURRENT_YEAR = new Date().getFullYear()

export function Wordmark({ to = '/login', className }) {
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5 font-display text-subtitle font-semibold tracking-tight', className)}
    >
      <svg viewBox="0 0 28 28" className="size-7 transition-transform duration-300 ease-out group-hover:-translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M4 24V11l10-7 10 7v13" strokeLinejoin="round" pathLength="1" className="draw-stroke" />
        <path
          d="M11 24v-7h6v7"
          strokeLinejoin="round"
          pathLength="1"
          className="draw-stroke"
          style={{ animationDelay: '0.4s' }}
        />
      </svg>
      RealtyHub
    </Link>
  )
}

const FEATURES = [
  { icon: House, text: 'Inventario de propiedades con estado al día' },
  { icon: Users, text: 'Seguimiento de clientes y oportunidades' },
  { icon: Building, text: 'Oficinas y equipos bajo una sola cuenta' },
]

/**
 * Layout compartido por todas las pantallas de autenticación.
 * Escritorio: panel de marca (evergreen) + formulario. Móvil: solo formulario.
 * El contenido usa `key={title}`: cada cambio de estado (p. ej. verificando → verificada) repite la entrada.
 */
export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="grid min-h-svh bg-floral-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-evergreen text-floral-white lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12">
        {/* Luz ambiental estática: profundidad sin movimiento decorativo (CLAUDE.md §7) */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgb(42_97_81/0.55),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgb(216_194_164/0.12),transparent_50%)]"
          aria-hidden="true"
        />
        {/* Retícula tenue, a modo de papel de plano, que se desvanece hacia los bordes */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          style={{
            backgroundImage:
              'linear-gradient(var(--floral-white) 1px, transparent 1px), linear-gradient(90deg, var(--floral-white) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        <Wordmark className="relative self-start text-floral-white" />

        <figure className="relative mx-auto w-full max-w-[420px]">
          <FacadeIllustration className="max-h-[42svh] w-full text-pale-oak" />
        </figure>

        <div className="relative max-w-[28rem] space-y-6">
          <p className="font-display text-section font-semibold leading-tight">
            Propiedades, clientes y oficinas en un mismo lugar.
          </p>
          <ul className="space-y-3 text-small text-floral-white/80">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-floral-white/15">
                  <Icon className="size-4 text-pale-oak" strokeWidth={1.75} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex flex-col overflow-hidden px-4 py-8 sm:px-8 lg:px-16 lg:py-12">
        <Wordmark className="relative self-center text-evergreen lg:hidden" />

        <div className="relative flex flex-1 items-center justify-center py-10">
          <div key={title} className="mx-auto w-full max-w-[400px] animate-rise">
            <header className="mb-8 space-y-2">
              <h1 className="text-page leading-tight text-evergreen">{title}</h1>
              {description && <p className="max-w-[45ch] text-body text-muted-foreground">{description}</p>}
            </header>
            <div>{children}</div>
            {footer && (
              <div className="mt-8 border-t border-ash-grey/60 pt-6 text-small text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>

        <p className="relative text-center text-meta text-muted-foreground">© {CURRENT_YEAR} RealtyHub</p>
      </main>
    </div>
  )
}

/** Enlace de texto dentro de formularios y pies de página. */
export function TextLink({ className, ...props }) {
  return (
    <Link
      className={cn(
        'font-medium text-emerald-depths bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[color,background-size] duration-300 ease-out hover:bg-[length:100%_1px] hover:text-evergreen focus-visible:bg-[length:100%_1px] focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}
