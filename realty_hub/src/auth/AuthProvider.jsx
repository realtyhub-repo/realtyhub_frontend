import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '@/api/authApi'
import { onSessionChange, refreshSession } from '@/api/client'
import { AuthContext } from './auth-context'

// Renovar el access token un poco antes de que expire (docs/auth_service.md §5.4).
const REFRESH_MARGIN_MS = 60_000
const MIN_DELAY_MS = 5_000
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('realtyhub:auth') : null

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const booted = useRef(false)

  // Cualquier cambio de token (login, refresh, logout, refresh fallido) actualiza el estado.
  useEffect(
    () =>
      onSessionChange((session) => {
        setUser(session)
        setStatus(session ? 'authenticated' : 'unauthenticated')
      }),
    [],
  )

  // Al cargar la app el token en memoria no existe: preguntar al backend si hay sesión.
  // useRef evita el doble efecto de StrictMode; refreshSession() además es single-flight.
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    refreshSession().catch(() => setStatus('unauthenticated'))
  }, [])

  // Renovación proactiva usando `exp` (nunca asumir una duración fija).
  useEffect(() => {
    if (!user?.exp) return
    const delay = Math.max(user.exp * 1000 - Date.now() - REFRESH_MARGIN_MS, MIN_DELAY_MS)
    const id = setTimeout(() => refreshSession().catch(() => {}), delay)
    return () => clearTimeout(id)
  }, [user?.exp])

  // Los timers se congelan en pestañas en segundo plano: al volver, renovar si hace falta.
  useEffect(() => {
    if (!user?.exp) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user.exp * 1000 - Date.now() < REFRESH_MARGIN_MS) {
        refreshSession().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.exp])

  // Sincronizar pestañas: un logout cierra todas; un login permite a las demás recuperar la sesión.
  useEffect(() => {
    if (!channel) return
    const onMessage = ({ data }) => {
      if (data === 'logout') authApi.logoutLocal()
      if (data === 'login') refreshSession().catch(() => {})
    }
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  }, [])

  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials)
    channel?.postMessage('login')
    return session
  }, [])

  const loginWithGoogle = useCallback(async (idToken) => {
    const session = await authApi.loginWithGoogle(idToken)
    channel?.postMessage('login')
    return session
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    channel?.postMessage('logout')
  }, [])

  const value = useMemo(
    () => ({ user, status, login, loginWithGoogle, logout }),
    [user, status, login, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
