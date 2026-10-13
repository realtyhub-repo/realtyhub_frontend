import { Building, ExternalLink, Plus, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { createAgente, listAgentesDeOficina, listOficinas, listUsers, updateAgente } from '@/api/userApi'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Field } from '@/components/auth/Field'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { UUID_RE } from '@/lib/format'

const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

/**
 * Agentes por oficina.
 * - ADMINISTRADOR_CENTRAL: cualquier oficina; elige al usuario de `GET /users`.
 * - GERENTE_OFICINA: solo su oficina, que se deduce de `GET /oficinas` por `gerenteId` (no hay endpoint
 *   "mi oficina", docs §7). No puede listar usuarios, así que indica el id del usuario a mano.
 */
export default function AgentsPage() {
  const { user } = useAuth()
  const isAdmin = user.rol === 'ADMINISTRADOR_CENTRAL'
  const [params, setParams] = useSearchParams()
  const oficinas = useAsync((signal) => listOficinas({ signal }), [])

  const list = useMemo(() => [...(oficinas.data ?? [])].sort(byName), [oficinas.data])
  const ownOffice = useMemo(() => list.find((o) => o.gerenteId === user.id), [list, user.id])
  const allowed = isAdmin ? list : ownOffice ? [ownOffice] : []
  const requested = params.get('oficina')
  const officeId = allowed.some((o) => o.id === requested) ? requested : allowed[0]?.id
  const office = allowed.find((o) => o.id === officeId)

  // Viene de Usuarios ("Registrar como agente"): abrir el alta con ese usuario elegido.
  const preselectUser = params.get('usuario')
  const [creating, setCreating] = useState(() => !!preselectUser)

  function selectOffice(id) {
    setParams((p) => {
      const next = new URLSearchParams(p)
      next.set('oficina', id)
      return next
    }, { replace: true })
  }

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title={isAdmin ? 'Agentes' : 'Mi equipo'}
        description={
          isAdmin
            ? 'Registra agentes en una oficina y actualiza su zona de especialidad.'
            : 'Agentes de la oficina que diriges.'
        }
        actions={
          office && (
            <Button onClick={() => setCreating(true)}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Registrar agente
            </Button>
          )
        }
      />

      {oficinas.error ? (
        <LoadError error={oficinas.error} onRetry={oficinas.reload} />
      ) : oficinas.loading ? (
        <ListSkeleton rows={4} />
      ) : !office ? (
        <EmptyState
          icon={Building}
          title={isAdmin ? 'Aún no hay oficinas registradas' : 'Aún no tienes una oficina asignada'}
          text={
            isAdmin
              ? 'Crea una oficina antes de registrar agentes.'
              : 'El administrador central debe asignarte como gerente de una oficina para gestionar su equipo.'
          }
          action={
            isAdmin && (
              <Button asChild size="sm">
                <Link to="/panel/oficinas">Ir a oficinas</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          {isAdmin ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="oficina">Oficina</Label>
              <Select id="oficina" value={officeId} onChange={(e) => selectOffice(e.target.value)}>
                {list.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} · {o.tipo === 'CENTRAL' ? 'Central' : 'Sucursal'}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <p className="text-small text-muted-foreground">
              Oficina: <span className="font-medium text-evergreen">{office.nombre}</span> · {office.region}
            </p>
          )}
          <AgentList
            key={office.id}
            office={office}
            oficinas={allowed}
            isAdmin={isAdmin}
            creating={creating}
            preselectUser={preselectUser}
            onCreatingChange={(v) => {
              setCreating(v)
              if (!v && preselectUser) {
                setParams((p) => {
                  const next = new URLSearchParams(p)
                  next.delete('usuario')
                  return next
                }, { replace: true })
              }
            }}
          />
        </>
      )}
    </div>
  )
}

function AgentList({ office, oficinas, isAdmin, creating, onCreatingChange, preselectUser }) {
  const agentes = useAsync((signal) => listAgentesDeOficina(office.id, { signal }), [office.id])
  const [editing, setEditing] = useState(null)
  const [toast, showToast] = useToast()
  const sorted = useMemo(
    () => [...(agentes.data ?? [])].sort((a, b) => (a.nombreUsuario ?? '').localeCompare(b.nombreUsuario ?? '', 'es')),
    [agentes.data],
  )

  return (
    <>
      {agentes.error ? (
        <LoadError error={agentes.error} onRetry={agentes.reload} />
      ) : agentes.loading ? (
        <ListSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={`${office.nombre} aún no tiene agentes`}
          text="Registra a un usuario con rol de agente o de gerente para que aparezca en esta oficina."
          action={
            <Button size="sm" onClick={() => onCreatingChange(true)}>
              Registrar agente
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-ash-grey/40 rounded-card border border-ash-grey/60">
          {sorted.map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-pale-oak/10">
              <Avatar name={a.nombreUsuario} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-evergreen">{a.nombreUsuario}</p>
                <p className="truncate text-small text-muted-foreground">{a.zonaEspecialidad || 'Sin zona de especialidad'}</p>
              </div>
              <Link
                to={`/agentes/${a.usuarioId}`}
                target="_blank"
                rel="noopener"
                className="hidden items-center gap-1.5 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen sm:inline-flex"
              >
                Ficha pública
                <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateAgentDialog
        open={creating}
        onOpenChange={onCreatingChange}
        office={office}
        oficinas={oficinas}
        isAdmin={isAdmin}
        preselectUser={preselectUser}
        onCreated={(agente) => {
          if (agente.oficinaId === office.id) agentes.setData((prev) => [...(prev ?? []), agente])
          onCreatingChange(false)
          showToast(`${agente.nombreUsuario} registrado como agente`)
        }}
      />

      <EditAgentDialog
        agente={editing}
        oficinas={oficinas}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
        onSaved={(id, patch) => {
          agentes.setData((prev) =>
            patch.oficinaId !== office.id ? prev.filter((a) => a.id !== id) : prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          )
          setEditing(null)
          showToast('Agente actualizado')
        }}
      />
      {toast}
    </>
  )
}

/** `POST /agentes`. Solo usuarios AGENTE o GERENTE_OFICINA; uno sin ficha previa (409 si ya la tiene). */
function CreateAgentDialog({ open, onOpenChange, office, oficinas, isAdmin, preselectUser, onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open && (
          <CreateAgentForm
            office={office}
            oficinas={oficinas}
            isAdmin={isAdmin}
            preselectUser={preselectUser}
            onCreated={onCreated}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateAgentForm({ office, oficinas, isAdmin, preselectUser, onCreated, onCancel }) {
  const [form, setForm] = useState({ usuarioId: preselectUser ?? '', oficinaId: office.id, zonaEspecialidad: '' })
  const [errors, setErrors] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // El administrador elige de la lista; el gerente no puede usar GET /users (403).
  const candidates = useAsync(
    (signal) =>
      isAdmin
        ? Promise.all([
            listUsers({ rol: 'AGENTE', activo: true, signal }),
            listUsers({ rol: 'GERENTE_OFICINA', activo: true, signal }),
          ]).then(([a, g]) => [...a, ...g].sort(byName))
        : Promise.resolve(null),
    [isAdmin],
  )

  const preselectMissing =
    isAdmin && preselectUser && candidates.data && !candidates.data.some((u) => u.id === preselectUser)

  // Si el usuario sugerido no es candidato, el select arranca vacío en vez de apuntar a una opción inexistente.
  const usuarioId = preselectMissing && form.usuarioId === preselectUser ? '' : form.usuarioId

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const id = usuarioId.trim()
    const errs = {}
    if (!id) errs.usuarioId = isAdmin ? 'Elige a un usuario' : 'Ingresa el id del usuario'
    else if (!UUID_RE.test(id)) errs.usuarioId = 'El id no tiene un formato válido'
    setErrors(Object.keys(errs).length ? errs : null)
    if (Object.keys(errs).length) return

    setSaving(true)
    setError(null)
    try {
      const zona = form.zonaEspecialidad.trim()
      const agente = await createAgente({ usuarioId: id, oficinaId: form.oficinaId, ...(zona ? { zonaEspecialidad: zona } : {}) })
      onCreated(agente)
    } catch (err) {
      setError(err.status === 404 ? { mensaje: 'No encontramos ese usuario o la oficina ya no existe.' } : err)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>Registrar agente</DialogTitle>
        <DialogDescription>
          La persona debe tener rol de agente o de gerente de oficina. Cada usuario tiene una sola ficha de agente.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-5">
        {isAdmin ? (
          <Field id="ag-usuario" label="Usuario" error={errors?.usuarioId}>
            {(p) =>
              candidates.loading ? (
                <span className="block h-11 animate-pulse rounded-control bg-pale-oak/30" />
              ) : candidates.error ? (
                <LoadError error={candidates.error} onRetry={candidates.reload} />
              ) : candidates.data.length === 0 ? (
                <p className="text-small text-muted-foreground">
                  No hay usuarios activos con rol de agente o gerente. Asigna el rol desde{' '}
                  <Link to="/panel/usuarios" className="font-medium text-emerald-depths hover:underline">
                    Usuarios
                  </Link>
                  .
                </p>
              ) : (
                <Select {...p} value={usuarioId} onChange={update('usuarioId')}>
                  <option value="">Elige un usuario</option>
                  {candidates.data.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} · {ROLE_LABELS[u.rol]}
                    </option>
                  ))}
                </Select>
              )
            }
          </Field>
        ) : (
          <Field
            id="ag-usuario"
            label="Id del usuario"
            error={errors?.usuarioId}
            hint={<p className="text-small text-muted-foreground">La persona lo encuentra en Mi perfil, dentro de su panel.</p>}
          >
            {(p) => <Input {...p} value={form.usuarioId} onChange={update('usuarioId')} placeholder="7b2f3c1e-5a4d-…" className="font-mono text-small" spellCheck={false} autoComplete="off" />}
          </Field>
        )}

        {preselectMissing && (
          <Alert variant="warning">
            <p>El usuario elegido no aparece como agente o gerente activo. Revisa su rol y estado en Usuarios.</p>
          </Alert>
        )}

        {isAdmin ? (
          <Field id="ag-oficina" label="Oficina">
            {(p) => (
              <Select {...p} value={form.oficinaId} onChange={update('oficinaId')}>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <p className="text-small text-muted-foreground">
            Oficina: <span className="font-medium text-evergreen">{office.nombre}</span>
          </p>
        )}

        <Field
          id="ag-zona"
          label="Zona de especialidad (opcional)"
          hint={<p className="text-small text-muted-foreground">Se muestra en su ficha pública, por ejemplo “Zona norte”.</p>}
        >
          {(p) => <Input {...p} value={form.zonaEspecialidad} onChange={update('zonaEspecialidad')} maxLength={120} />}
        </Field>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <p>{error.mensaje}</p>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} disabled={isAdmin && !candidates.data?.length}>
          Registrar agente
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * `PUT /agentes/{id}` con el id del registro de agente. `oficinaId` va siempre (obligatorio);
 * la zona solo si cambió. Si nada cambió no se llama al endpoint (docs §4.7).
 */
function EditAgentDialog({ agente, oficinas, isAdmin, onClose, onSaved }) {
  return (
    <Dialog open={!!agente} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {agente && <EditAgentForm key={agente.id} agente={agente} oficinas={oficinas} isAdmin={isAdmin} onSaved={onSaved} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function EditAgentForm({ agente, oficinas, isAdmin, onSaved, onCancel }) {
  const [oficinaId, setOficinaId] = useState(agente.oficinaId)
  const [zona, setZona] = useState(agente.zonaEspecialidad ?? '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const zonaTrim = zona.trim()
  const zonaChanged = zonaTrim !== '' && zonaTrim !== (agente.zonaEspecialidad ?? '')
  const officeChanged = oficinaId !== agente.oficinaId
  const cleared = zonaTrim === '' && !!agente.zonaEspecialidad

  async function handleSubmit(e) {
    e.preventDefault()
    if (!zonaChanged && !officeChanged) {
      onCancel()
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateAgente(agente.id, { oficinaId, ...(zonaChanged ? { zonaEspecialidad: zonaTrim } : {}) })
      const nombreOficina = oficinas.find((o) => o.id === oficinaId)?.nombre ?? agente.nombreOficina
      onSaved(agente.id, { oficinaId, nombreOficina, ...(zonaChanged ? { zonaEspecialidad: zonaTrim } : {}) })
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>Editar a {agente.nombreUsuario}</DialogTitle>
        <DialogDescription>Cambia su oficina o su zona de especialidad.</DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-5">
        {isAdmin && (
          <Field id="ed-oficina" label="Oficina">
            {(p) => (
              <Select {...p} value={oficinaId} onChange={(e) => setOficinaId(e.target.value)}>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field id="ed-zona" label="Zona de especialidad">
          {(p) => <Input {...p} value={zona} onChange={(e) => setZona(e.target.value)} maxLength={120} placeholder="Zona norte" />}
        </Field>
        {cleared && (
          <p className="text-small text-muted-foreground">
            La zona no se puede dejar vacía: si la borras, se conserva “{agente.zonaEspecialidad}”.
          </p>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <p>{error.mensaje}</p>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} disabled={!zonaChanged && !officeChanged}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  )
}
