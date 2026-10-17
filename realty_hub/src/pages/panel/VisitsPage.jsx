import { lazy, Suspense } from 'react'
import { useAuth } from '@/auth/auth-context'
import ClientVisitsPage from '@/pages/panel/ClientVisitsPage'

// La agenda trae Schedule-X (y preact): se carga solo para los roles que la usan.
const AgendaPage = lazy(() => import('@/pages/panel/AgendaPage'))

/**
 * `/panel/visitas`: `GET /visitas/mis-visitas` ya filtra por rol (docs/visits-service.md). El CLIENTE ve la
 * lista de sus visitas; los demás roles, la agenda semanal de las visitas donde son el agente.
 */
export default function VisitsPage() {
  const { user } = useAuth()
  if (user.rol === 'CLIENTE') return <ClientVisitsPage />
  return (
    <Suspense fallback={<span className="block h-[70svh] max-w-7xl animate-pulse rounded-card bg-pale-oak/20" role="status" aria-label="Cargando agenda" />}>
      <AgendaPage />
    </Suspense>
  )
}
