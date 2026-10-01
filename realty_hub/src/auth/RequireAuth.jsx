import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { useAuth } from './auth-context'

/** Rutas privadas. `roles` opcional para restringir por rol del JWT. */
export function RequireAuth({ roles }) {
  const { status, user } = useAuth()
  const location = useLocation()

  // Mientras se resuelve el refresh inicial no redirigir todavía (docs §5.4).
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (roles && !roles.includes(user.rol)) return <Navigate to="/panel" replace />
  return <Outlet />
}

/** Rutas solo para invitados (login, registro): si ya hay sesión, ir al panel. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from?.pathname ?? '/panel'} replace />
  }
  return <Outlet />
}
