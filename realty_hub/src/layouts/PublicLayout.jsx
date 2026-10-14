import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { Wordmark } from '@/components/auth/AuthLayout'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

const navLink = ({ isActive }) =>
  cn(
    'relative py-1 text-small font-medium transition-colors duration-150',
    'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-evergreen after:transition-transform after:duration-200',
    isActive ? 'text-evergreen after:scale-x-100' : 'text-muted-foreground after:scale-x-0 hover:text-evergreen hover:after:scale-x-100',
  )

/** Layout del sitio público: cabecera ligera sobre floral-white y pie en evergreen (CLAUDE.md §2). */
export function PublicLayout() {
  const { status } = useAuth()

  return (
    <div className="flex min-h-svh flex-col bg-floral-white">
      <header className="sticky top-0 z-30 border-b border-ash-grey/40 bg-floral-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-8">
          <Wordmark to="/propiedades" className="text-evergreen" />
          <nav aria-label="Principal" className="hidden items-center gap-6 sm:flex">
            <NavLink to="/propiedades" className={navLink}>
              Propiedades
            </NavLink>
            <NavLink to="/oficinas" className={navLink}>
              Oficinas
            </NavLink>
          </nav>
          <div className="ml-auto">
            {status === 'authenticated' ? (
              <Link to="/panel" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Ir al panel
              </Link>
            ) : (
              <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-evergreen text-floral-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <Wordmark to="/propiedades" className="text-floral-white" />
            <p className="max-w-[44ch] text-small text-floral-white/70">
              Oficinas y agentes con conocimiento de cada zona, para acompañarte en la compra o el alquiler de tu próximo hogar.
            </p>
          </div>
          <nav aria-label="Pie de página" className="flex gap-8 text-small text-floral-white/70">
            <Link to="/propiedades" className="transition-colors duration-150 hover:text-floral-white">
              Propiedades
            </Link>
            <Link to="/oficinas" className="transition-colors duration-150 hover:text-floral-white">
              Oficinas
            </Link>
            <Link to="/login" className="transition-colors duration-150 hover:text-floral-white">
              Acceso de agentes
            </Link>
          </nav>
        </div>
        <div className="border-t border-floral-white/10">
          <p className="mx-auto max-w-7xl px-4 py-4 text-meta text-floral-white/50 sm:px-8">© {CURRENT_YEAR} RealtyHub</p>
        </div>
      </footer>
    </div>
  )
}
