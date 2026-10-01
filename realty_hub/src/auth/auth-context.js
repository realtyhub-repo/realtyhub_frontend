import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/** { status: 'loading' | 'authenticated' | 'unauthenticated', user: { id, rol, exp } | null, login, loginWithGoogle, logout } */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

export const ROLE_LABELS = {
  ADMINISTRADOR_CENTRAL: 'Administrador central',
  GERENTE_OFICINA: 'Gerente de oficina',
  AGENTE: 'Agente',
}
