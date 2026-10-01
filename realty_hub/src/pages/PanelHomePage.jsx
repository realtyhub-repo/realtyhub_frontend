import { ROLE_LABELS, useAuth } from '@/auth/auth-context'

/** Placeholder del panel: muestra lo que se obtiene del access token (sub, rol, exp). */
export default function PanelHomePage() {
  const { user } = useAuth()

  return (
    <section className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-page leading-tight text-evergreen">Panel</h1>
        <p className="text-muted-foreground">Sesión iniciada correctamente.</p>
      </header>

      <dl className="divide-y divide-ash-grey/60 rounded-card border border-ash-grey/70">
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]">
          <dt className="text-small text-muted-foreground">Rol</dt>
          <dd className="font-medium">{ROLE_LABELS[user.rol] ?? user.rol}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]">
          <dt className="text-small text-muted-foreground">ID de usuario</dt>
          <dd className="break-all font-mono text-small">{user.id}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]">
          <dt className="text-small text-muted-foreground">Token vence</dt>
          <dd className="text-small">{new Date(user.exp * 1000).toLocaleString('es')}</dd>
        </div>
      </dl>
    </section>
  )
}
