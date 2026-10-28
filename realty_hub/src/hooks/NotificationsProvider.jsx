import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getContador, marcarLeida as apiMarcarLeida, marcarTodasLeidas as apiMarcarTodasLeidas } from '@/api/notificacionApi'
import { useAuth } from '@/auth/auth-context'
import { NotificationsContext } from './notifications-context'

const POLL_MS = 15_000
const MAX_BACKOFF_MS = 120_000

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [noLeidas, setNoLeidas] = useState(0)
  const [cambios, setCambios] = useState(0)
  const countRef = useRef(0)
  const pollRef = useRef(() => {})

  const applyCount = useCallback((value) => {
    countRef.current = value
    setNoLeidas(value)
  }, [])

  useEffect(() => {
    let timer = null
    let ctrl = null
    let fails = 0
    let cancelled = false

    applyCount(0)

    function schedule() {
      timer = setTimeout(poll, Math.min(POLL_MS * 2 ** fails, MAX_BACKOFF_MS))
    }

    async function poll() {
      clearTimeout(timer)
      if (document.visibilityState !== 'visible') {
        schedule()
        return
      }
      ctrl?.abort()
      ctrl = new AbortController()
      try {
        const data = await getContador({ signal: ctrl.signal })
        if (cancelled) return
        fails = 0
        if (data.noLeidas !== countRef.current) {
          applyCount(data.noLeidas)
          setCambios((c) => c + 1)
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        fails += 1
      }
      schedule()
    }

    function onVisible() {
      if (document.visibilityState === 'visible') poll()
    }

    pollRef.current = poll
    document.addEventListener('visibilitychange', onVisible)
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
      ctrl?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, applyCount])

  const refresh = useCallback(() => pollRef.current(), [])

  const marcarLeida = useCallback(
    async (id) => {
      applyCount(Math.max(0, countRef.current - 1))
      try {
        return await apiMarcarLeida(id)
      } catch (err) {
        pollRef.current()
        throw err
      }
    },
    [applyCount],
  )

  const marcarTodasLeidas = useCallback(async () => {
    const result = await apiMarcarTodasLeidas()
    applyCount(0)
    return result
  }, [applyCount])

  const value = useMemo(
    () => ({ noLeidas, cambios, refresh, marcarLeida, marcarTodasLeidas }),
    [noLeidas, cambios, refresh, marcarLeida, marcarTodasLeidas],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
