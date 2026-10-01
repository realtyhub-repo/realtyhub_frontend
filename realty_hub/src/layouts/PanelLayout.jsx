import { Building, ChevronRight, Contact, House, LayoutGrid, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Wordmark } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const NAV = [{ to: '/panel', label: 'Inicio', icon: LayoutGrid, end: true }]

// Módulos aún no disponibles en el frontend: se muestran deshabilitados para anticipar la navegación.
const UPCOMING = [
  { label: 'Propiedades', icon: House },
  { label: 'Clientes', icon: Contact },
  { label: 'Oficinas', icon: Building },
]

// Título de cada ruta para el breadcrumb de la barra superior.
const ROUTE_TITLES = { '/panel': 'Inicio' }

const navItem =
  'group relative flex h-10 items-center gap-3 rounded-control px-3 text-small font-medium transition-[background-color,color] duration-150'

const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** Layout del panel interno: sidebar fijo + contenido, alineado a la izquierda (CLAUDE.md §4). */
export function PanelLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [todayLabel] = useState(() => today.format(new Date()))
  const roleLabel = ROLE_LABELS[user?.rol] ?? user?.rol
  const pageTitle = ROUTE_TITLES[location.pathname] ?? 'Panel'

  return (
    <div className="min-h-svh bg-floral-white md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-svh">
        <Sidebar roleLabel={roleLabel} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ash-grey/50 bg-floral-white/90 px-4 backdrop-blur-sm sm:px-8 lg:px-12">
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label="Abrir menú">
                <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent side="left" hideClose>
              <DialogTitle className="sr-only">Menú principal</DialogTitle>
              <DialogDescription className="sr-only">Navegación del panel</DialogDescription>
              <Sidebar roleLabel={roleLabel} onNavigate={() => setMenuOpen(false)} />
            </DialogContent>
          </Dialog>

          <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-small">
            <span className="text-muted-foreground">Panel</span>
            <ChevronRight className="size-3.5 shrink-0 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate font-medium text-evergreen" aria-current="page">
              {pageTitle}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <p className="hidden text-small text-muted-foreground first-letter:uppercase lg:block">{todayLabel}</p>
            <span className="hidden h-6 w-px bg-ash-grey/60 lg:block" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-small font-medium leading-tight text-evergreen">{roleLabel}</span>
              </span>
              <Avatar label={roleLabel} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Avatar({ label, className }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-pale-oak font-display text-small font-semibold text-evergreen',
        className,
      )}
      aria-hidden="true"
    >
      {label?.charAt(0)}
    </span>
  )
}

/** Contenido del sidebar: se reutiliza en escritorio (fijo) y en móvil (panel lateral). */
function Sidebar({ roleLabel, onNavigate }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  async function handleLogout() {
    setLeaving(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full w-full flex-col bg-evergreen text-floral-white">
      <div className="flex h-16 shrink-0 items-center border-b border-floral-white/10 px-6">
        <Wordmark to="/panel" className="text-floral-white" />
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-3 py-6" aria-label="Principal">
        <NavGroup title="General">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    navItem,
                    isActive
                      ? 'bg-floral-white/10 text-floral-white'
                      : 'text-floral-white/70 hover:bg-floral-white/5 hover:text-floral-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute inset-y-2 left-0 w-0.5 rounded-full bg-pale-oak transition-opacity duration-150',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </NavGroup>

        <NavGroup title="Gestión">
          {UPCOMING.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className={cn(navItem, 'cursor-default text-floral-white/40')}
              aria-disabled="true"
              title="Módulo en desarrollo"
            >
              <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              {label}
              <span className="ml-auto text-meta font-normal text-floral-white/35">Pronto</span>
            </li>
          ))}
        </NavGroup>
      </nav>

      <div className="shrink-0 border-t border-floral-white/10 p-3">
        <div className="flex items-center gap-3 rounded-control px-3 py-2">
          <Avatar label={roleLabel} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-medium">{roleLabel}</p>
            <p className="flex items-center gap-1.5 text-meta text-floral-white/60">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              Sesión activa
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            loading={leaving}
            className="size-9 shrink-0 text-floral-white/70 hover:bg-floral-white/10 hover:text-floral-white focus-visible:ring-pale-oak focus-visible:ring-offset-evergreen"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            {!leaving && <LogOut strokeWidth={1.75} aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

function NavGroup({ title, children }) {
  return (
    <div>
      <p className="px-3 pb-2 text-meta font-medium text-floral-white/45">{title}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}
