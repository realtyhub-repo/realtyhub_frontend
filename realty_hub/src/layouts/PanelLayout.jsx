import {
  Building,
  ChevronRight,
  Contact,
  House,
  LayoutGrid,
  LogOut,
  MapPinned,
  Menu,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router'
import { getMe } from '@/api/userApi'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Wordmark } from '@/components/auth/AuthLayout'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'

const ADMIN = 'ADMINISTRADOR_CENTRAL'
const GERENTE = 'GERENTE_OFICINA'

/** Navegación por rol. Ocultar entradas es solo UX: el backend vuelve a validar (docs/user-service.md §1). */
const NAV_GROUPS = [
  {
    title: 'General',
    items: [
      { to: '/panel', label: 'Inicio', icon: LayoutGrid, end: true },
      { to: '/panel/perfil', label: 'Mi perfil', icon: UserRound },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/panel/usuarios', label: 'Usuarios', icon: Users, roles: [ADMIN] },
      { to: '/panel/oficinas', label: 'Oficinas', icon: Building, roles: [ADMIN] },
      { to: '/panel/agentes', label: 'Agentes', icon: UsersRound, roles: [ADMIN] },
      { to: '/panel/agentes', label: 'Mi equipo', icon: UsersRound, roles: [GERENTE] },
    ],
  },
]

// Módulos aún no disponibles en el frontend: se muestran deshabilitados para anticipar la navegación.
const UPCOMING = [
  { label: 'Propiedades', icon: House },
  { label: 'Clientes', icon: Contact },
]

// Título de cada ruta para el breadcrumb de la barra superior.
const ROUTE_TITLES = [
  ['/panel', 'Inicio'],
  ['/panel/perfil', 'Mi perfil'],
  ['/panel/usuarios', 'Usuarios'],
  ['/panel/oficinas', 'Oficinas'],
  ['/panel/agentes', 'Agentes'],
]

const navItem =
  'group relative flex h-10 items-center gap-3 rounded-control px-3 text-small font-medium transition-[background-color,color] duration-150'

const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Layout del panel interno: sidebar fijo + contenido, alineado a la izquierda (CLAUDE.md §4).
 * Carga el perfil (`GET /users/me`) una vez y lo comparte con las páginas vía `useOutletContext()`.
 */
export function PanelLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [todayLabel] = useState(() => today.format(new Date()))
  const me = useAsync((signal) => getMe({ signal }), [user.id])
  const roleLabel = ROLE_LABELS[user.rol] ?? user.rol
  const pageTitle = ROUTE_TITLES.find(([path]) => matchPath(path, location.pathname))?.[1] ?? 'Panel'
  const displayName = me.data?.nombre ?? roleLabel

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(user.rol)) })).filter(
        (g) => g.items.length,
      ),
    [user.rol],
  )

  const outletContext = useMemo(
    () => ({ me: me.data, meLoading: me.loading, meError: me.error, setMe: me.setData, reloadMe: me.reload }),
    [me.data, me.loading, me.error, me.setData, me.reload],
  )

  const sidebarProps = { groups, displayName, roleLabel, photo: me.data?.urlFoto }

  return (
    <div className="min-h-svh bg-floral-white md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-svh">
        <Sidebar {...sidebarProps} />
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
              <Sidebar {...sidebarProps} onNavigate={() => setMenuOpen(false)} />
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
            <Link
              to="/panel/perfil"
              className="flex items-center gap-3 rounded-control p-1 transition-colors duration-150 hover:bg-pale-oak/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="hidden text-right sm:block">
                <span className="block max-w-[22ch] truncate text-small font-medium leading-tight text-evergreen">
                  {displayName}
                </span>
                {me.data && <span className="block text-meta leading-tight text-muted-foreground">{roleLabel}</span>}
              </span>
              <Avatar name={displayName} src={me.data?.urlFoto} />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}

/** Contenido del sidebar: se reutiliza en escritorio (fijo) y en móvil (panel lateral). */
function Sidebar({ groups, displayName, roleLabel, photo, onNavigate }) {
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
        {groups.map((group) => (
          <NavGroup key={group.title} title={group.title}>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={label}>
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
        ))}

        <NavGroup title="Próximamente">
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

        <NavGroup title="Sitio público">
          <li>
            <Link
              to="/oficinas"
              onClick={onNavigate}
              className={cn(navItem, 'text-floral-white/70 hover:bg-floral-white/5 hover:text-floral-white')}
            >
              <MapPinned className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              Directorio de oficinas
            </Link>
          </li>
        </NavGroup>
      </nav>

      <div className="shrink-0 border-t border-floral-white/10 p-3">
        <div className="flex items-center gap-3 rounded-control px-3 py-2">
          <Avatar name={displayName} src={photo} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-medium">{displayName}</p>
            <p className="truncate text-meta text-floral-white/60">{roleLabel}</p>
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
