import { LayoutGrid, LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Layout del panel interno: sidebar fijo + contenido, alineado a la izquierda (CLAUDE.md §4). */
export function PanelLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  async function handleLogout() {
    setLeaving(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-floral-white md:flex-row">
      <aside className="flex shrink-0 flex-col bg-evergreen text-floral-white md:sticky md:top-0 md:h-svh md:w-64">
        <div className="flex items-center justify-between gap-4 px-6 py-5 md:block">
          <span className="font-display text-subtitle font-semibold">RealtyHub</span>
        </div>
        <nav className="flex-1 px-3 pb-3" aria-label="Principal">
          <NavLink
            to="/panel"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-control px-3 py-2 text-small font-medium transition-colors duration-150',
                isActive ? 'bg-emerald-depths text-floral-white' : 'text-floral-white/75 hover:bg-emerald-depths/50',
              )
            }
          >
            <LayoutGrid className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            Inicio
          </NavLink>
        </nav>
        <div className="border-t border-floral-white/15 px-6 py-4">
          <p className="text-meta text-floral-white/60">{ROLE_LABELS[user?.rol] ?? user?.rol}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            loading={leaving}
            className="-ml-3 mt-1 text-floral-white hover:bg-emerald-depths/60"
          >
            {!leaving && <LogOut strokeWidth={1.75} aria-hidden="true" />}
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <Outlet />
      </div>
    </div>
  )
}
