import { Building, ChevronRight, Contact, House, UserRound, Users, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Badge } from '@/components/ui/badge'

const MODULES = [
  { icon: UserRound, title: 'Mi perfil', text: 'Actualiza tu nombre, teléfono y foto.', to: '/panel/perfil' },
  { icon: Users, title: 'Usuarios', text: 'Asigna roles y activa o desactiva cuentas.', to: '/panel/usuarios', roles: ['ADMINISTRADOR_CENTRAL'] },
  { icon: Building, title: 'Oficinas', text: 'Centrales, sucursales, ubicación y gerentes.', to: '/panel/oficinas', roles: ['ADMINISTRADOR_CENTRAL'] },
  { icon: UsersRound, title: 'Agentes', text: 'Registra agentes y su zona de especialidad.', to: '/panel/agentes', roles: ['ADMINISTRADOR_CENTRAL'] },
  { icon: UsersRound, title: 'Mi equipo', text: 'Agentes de la oficina que diriges.', to: '/panel/agentes', roles: ['GERENTE_OFICINA'] },
  { icon: House, title: 'Propiedades', text: 'Publica, edita y sigue el estado de cada inmueble.' },
  { icon: Contact, title: 'Clientes', text: 'Registra interesados y avanza cada oportunidad.' },
]

function greeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Inicio del panel: saludo y módulos disponibles según el rol. */
export default function PanelHomePage() {
  const { user } = useAuth()
  const { me } = useOutletContext() ?? {}
  const modules = MODULES.filter((m) => !m.roles || m.roles.includes(user.rol))
  const available = modules.filter((m) => m.to).length
  const roleLabel = ROLE_LABELS[user.rol] ?? user.rol
  const [saludo] = useState(() => greeting(new Date()))

  return (
    <div className="max-w-6xl space-y-10">
      <header className="flex flex-col gap-4 border-b border-ash-grey/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-small text-muted-foreground">{saludo}</p>
          <h1 className="text-page leading-tight text-evergreen">{me?.nombre ?? `Panel de ${roleLabel.toLowerCase()}`}</h1>
          <p className="max-w-[60ch] text-muted-foreground">
            Panel de {roleLabel.toLowerCase()}. Desde aquí gestionas las herramientas de tu rol.
          </p>
        </div>
        <Badge variant="success" dot className="self-start sm:self-auto">
          Sesión activa
        </Badge>
      </header>

      <section aria-labelledby="modulos-title">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="modulos-title" className="text-section leading-tight text-evergreen">
            Módulos
          </h2>
          <p className="text-small text-muted-foreground">
            {available} {available === 1 ? 'disponible' : 'disponibles'}
          </p>
        </div>
        <ul className="mt-4 divide-y divide-ash-grey/50 rounded-card border border-ash-grey/60">
          {modules.map(({ icon: Icon, title, text, to }) => {
            const body = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-ash-grey/70 text-evergreen">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-body leading-tight text-evergreen">{title}</h3>
                  <p className="mt-0.5 text-small text-muted-foreground">{text}</p>
                </div>
                {to ? (
                  <ChevronRight className="size-4 shrink-0 text-ash-grey transition-colors duration-150 group-hover:text-evergreen" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    En desarrollo
                  </Badge>
                )}
              </>
            )
            return (
              <li key={title}>
                {to ? (
                  <Link to={to} className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-pale-oak/10 focus-visible:bg-pale-oak/15 focus-visible:outline-none">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4 opacity-70">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
