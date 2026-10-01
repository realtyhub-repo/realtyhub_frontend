import { Building, Clock, Contact, House, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Badge } from '@/components/ui/badge'

const MODULES = [
  { icon: House, title: 'Propiedades', text: 'Publica, edita y sigue el estado de cada inmueble.' },
  { icon: Contact, title: 'Clientes', text: 'Registra interesados y avanza cada oportunidad.' },
  { icon: Building, title: 'Oficinas', text: 'Organiza equipos y agentes por sucursal.' },
]

function greeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Reloj que avanza cada segundo: alimenta la cuenta regresiva del token. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatRemaining(ms) {
  if (ms <= 0) return 'Renovando'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${s} min`
}

/** Placeholder del panel: muestra lo que se obtiene del access token (sub, rol, exp). */
export default function PanelHomePage() {
  const { user } = useAuth()
  const now = useNow()
  const roleLabel = ROLE_LABELS[user.rol] ?? user.rol
  const expiresAt = new Date(user.exp * 1000)

  return (
    <div className="max-w-6xl space-y-10">
      <header className="flex flex-col gap-4 border-b border-ash-grey/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-small text-muted-foreground">{greeting(new Date(now))}</p>
          <h1 className="text-page leading-tight text-evergreen">Panel de {roleLabel.toLowerCase()}</h1>
          <p className="max-w-[60ch] text-muted-foreground">
            Desde aquí gestionarás las herramientas de tu rol. Cada módulo se activa en cuanto esté disponible.
          </p>
        </div>
        <Badge variant="success" dot className="self-start sm:self-auto">
          Sesión activa
        </Badge>
      </header>

      <section aria-labelledby="resumen-title">
        <h2 id="resumen-title" className="sr-only">
          Resumen de la sesión
        </h2>
        <dl className="grid divide-y divide-ash-grey/50 rounded-card border border-ash-grey/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat icon={ShieldCheck} label="Rol" value={roleLabel} />
          <Stat icon={Clock} label="Token vence en" value={formatRemaining(expiresAt - now)} />
          <Stat
            icon={KeyRound}
            label="Hora de vencimiento"
            value={expiresAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          />
        </dl>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <section aria-labelledby="modulos-title">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="modulos-title" className="text-section leading-tight text-evergreen">
              Módulos
            </h2>
            <p className="text-small text-muted-foreground">{MODULES.length} en desarrollo</p>
          </div>
          <ul className="mt-4 divide-y divide-ash-grey/50 rounded-card border border-ash-grey/60">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-pale-oak/10">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-ash-grey/70 text-evergreen">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-body leading-tight text-evergreen">{title}</h3>
                  <p className="mt-0.5 text-small text-muted-foreground">{text}</p>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  En desarrollo
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sesion-title">
          <h2 id="sesion-title" className="text-section leading-tight text-evergreen">
            Sesión
          </h2>
          <div className="mt-4 rounded-card bg-pale-oak/25 p-6">
            <dl className="space-y-4 text-small">
              <div>
                <dt className="text-muted-foreground">ID de usuario</dt>
                <dd className="mt-1 break-all font-mono text-meta text-evergreen">{user.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rol asignado</dt>
                <dd className="mt-1 font-medium text-evergreen">{roleLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Token vence</dt>
                <dd className="mt-1 font-medium text-evergreen">
                  {expiresAt.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                </dd>
              </div>
            </dl>
            <p className="mt-6 border-t border-evergreen/10 pt-4 text-meta text-muted-foreground">
              La sesión se renueva automáticamente un minuto antes de vencer.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="px-6 py-5">
      <dt className="flex items-center gap-2 text-small text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-2 truncate font-display text-section font-semibold leading-tight text-evergreen tabular-nums">
        {value}
      </dd>
    </div>
  )
}
