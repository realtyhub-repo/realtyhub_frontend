import { createContext, useContext } from 'react'

export const NotificationsContext = createContext(null)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>')
  return ctx
}
