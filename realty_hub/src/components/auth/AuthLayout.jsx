import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { FacadeIllustration } from './FacadeIllustration'

const CURRENT_YEAR = new Date().getFullYear()

export function Wordmark({ className }) {
  return (
    <Link
      to="/login"
      className={cn('inline-flex items-center gap-2.5 font-display text-subtitle font-semibold tracking-tight', className)}
    >
      <svg viewBox="0 0 28 28" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M4 24V11l10-7 10 7v13" strokeLinejoin="round" />
        <path d="M11 24v-7h6v7" strokeLinejoin="round" />
      </svg>
      RealtyHub
    </Link>
  )
}

/**
 * Layout compartido por todas las pantallas de autenticación.
 * Escritorio: panel de marca (evergreen) + formulario. Móvil: solo formulario.
 */
export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="grid min-h-svh bg-floral-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-evergreen text-floral-white lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12">
        {/* Retícula tenue, a modo de papel de plano */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(var(--floral-white) 1px, transparent 1px), linear-gradient(90deg, var(--floral-white) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        <Wordmark className="relative text-floral-white" />

        <FacadeIllustration className="relative mx-auto max-h-[48svh] w-full max-w-[420px] text-pale-oak" />

        <div className="relative max-w-[26rem] space-y-3">
          <p className="font-display text-section font-semibold leading-tight">
            Propiedades, clientes y oficinas en un mismo lugar.
          </p>
          <p className="text-small text-floral-white/70">
            Plataforma de trabajo para agentes, gerentes de oficina y administración central.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8 lg:px-16 lg:py-12">
        <Wordmark className="self-start text-evergreen lg:hidden" />

        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[400px]">
            <header className="mb-8 space-y-2">
              <h1 className="text-page leading-tight text-evergreen">{title}</h1>
              {description && <p className="max-w-[45ch] text-body text-muted-foreground">{description}</p>}
            </header>
            {children}
            {footer && (
              <div className="mt-8 border-t border-ash-grey/60 pt-6 text-small text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>

        <p className="text-meta text-muted-foreground">© {CURRENT_YEAR} RealtyHub</p>
      </main>
    </div>
  )
}

/** Enlace de texto dentro de formularios y pies de página. */
export function TextLink({ className, ...props }) {
  return (
    <Link
      className={cn(
        'font-medium text-emerald-depths underline-offset-4 transition-colors duration-150 hover:text-evergreen hover:underline focus-visible:underline focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}
