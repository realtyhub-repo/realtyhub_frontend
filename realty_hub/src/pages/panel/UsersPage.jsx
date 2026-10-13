import { Search, UserRoundX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ROLES, getUser, listUsers, updateUserRole, updateUserStatus } from '@/api/userApi'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = { todos: undefined, activos: true, inactivos: false }

/** Gestión de usuarios (ADMINISTRADOR_CENTRAL): filtros `rol`/`activo` en el servidor, búsqueda local. */
export default function UsersPage() {
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('todos')
  const [term, setTerm] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, showToast] = useToast()

  const users = useAsync(
    (signal) => listUsers({ rol: rol || undefined, activo: STATUS_FILTERS[estado], signal }),
    [rol, estado],
  )

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase()
    const list = users.data ?? []
    const filtered = q
      ? list.filter((u) => u.nombre?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      : list
    return [...filtered].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
  }, [users.data, term])

  const filtersActive = rol || estado !== 'todos' || term.trim()

  function patchUser(id, patch) {
    users.setData((list) => list?.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Usuarios"
        description="Cambia roles y activa o desactiva cuentas. Para convertir a alguien en agente, primero asígnale el rol y luego regístralo en Agentes."
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_180px]">
        <div className="relative">
          <Label htmlFor="buscar" className="sr-only">
            Buscar por nombre o correo
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
          <Input id="buscar" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre o correo" className="pl-9" />
        </div>
        <div>
          <Label htmlFor="filtro-rol" className="sr-only">
            Rol
          </Label>
          <Select id="filtro-rol" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filtro-estado" className="sr-only">
            Estado
          </Label>
          <Select id="filtro-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Desactivados</option>
          </Select>
        </div>
      </div>

      {users.error ? (
        <LoadError error={users.error} onRetry={users.reload} />
      ) : users.loading && !users.data ? (
        <ListSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={UserRoundX}
          title={filtersActive ? 'Ningún usuario coincide con los filtros' : 'Aún no hay usuarios registrados'}
          action={
            filtersActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRol('')
                  setEstado('todos')
                  setTerm('')
                }}
              >
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <div className={cn('overflow-hidden rounded-card border border-ash-grey/60 transition-opacity duration-150', users.loading && 'opacity-60')}>
          <table className="w-full text-left text-small">
            <thead className="border-b border-ash-grey/60 bg-pale-oak/15 text-meta text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Usuario</th>
                <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Rol</th>
                <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Estado</th>
                <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Registro</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-grey/40">
              {visible.map((u) => (
                <tr key={u.id} className="transition-colors duration-150 hover:bg-pale-oak/10">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.nombre} src={u.urlFoto} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-evergreen">{u.nombre}</p>
                        <p className="truncate text-meta text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-evergreen md:table-cell">{ROLE_LABELS[u.rol] ?? u.rol}</td>
                  <td className="hidden px-5 py-3 sm:table-cell">
                    <StatusBadge activo={u.activo} />
                  </td>
                  <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(u.id)}>
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-ash-grey/40 px-5 py-3 text-meta text-muted-foreground">
            {visible.length} de {users.data?.length ?? 0} usuarios
          </p>
        </div>
      )}

      <UserDialog
        userId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={(id, patch, message) => {
          patchUser(id, patch)
          showToast(message)
        }}
      />
      {toast}
    </div>
  )
}

function StatusBadge({ activo }) {
  return (
    <Badge variant={activo ? 'success' : 'outline'} dot>
      {activo ? 'Activo' : 'Desactivado'}
    </Badge>
  )
}

/** Detalle (`GET /users/{id}`) + cambio de rol y de estado. No aplica sobre uno mismo (409). */
function UserDialog({ userId, onClose, onChanged }) {
  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {userId && <UserDetail key={userId} userId={userId} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  )
}

function UserDetail({ userId, onChanged }) {
  const { user: session } = useAuth()
  const detail = useAsync((signal) => getUser(userId, { signal }), [userId])
  const [rol, setRol] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmStatus, setConfirmStatus] = useState(false)
  const [promoted, setPromoted] = useState(null)

  const u = detail.data
  const isSelf = userId === session.id
  const selectedRol = rol ?? u?.rol

  async function handleRole() {
    setSaving(true)
    setError(null)
    try {
      await updateUserRole(userId, selectedRol)
      detail.setData((d) => ({ ...d, rol: selectedRol }))
      setRol(null)
      onChanged(userId, { rol: selectedRol }, 'Rol actualizado')
      setPromoted(selectedRol === 'AGENTE' || selectedRol === 'GERENTE_OFICINA' ? selectedRol : null)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus() {
    const next = !u.activo
    await updateUserStatus(userId, next)
    detail.setData((d) => ({ ...d, activo: next }))
    onChanged(userId, { activo: next }, next ? 'Usuario activado' : 'Usuario desactivado')
  }

  if (detail.loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando usuario">
        <DialogTitle className="sr-only">Cargando usuario</DialogTitle>
        <DialogDescription className="sr-only">Detalle del usuario</DialogDescription>
        <div className="flex items-center gap-4">
          <span className="size-14 animate-pulse rounded-full bg-pale-oak/40" />
          <span className="h-4 w-40 animate-pulse rounded-full bg-pale-oak/40" />
        </div>
        <span className="block h-24 animate-pulse rounded-card bg-pale-oak/25" />
      </div>
    )
  }

  if (detail.error) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Usuario</DialogTitle>
          <DialogDescription className="sr-only">Error al cargar</DialogDescription>
        </DialogHeader>
        <LoadError
          className="mt-6"
          error={detail.error.status === 404 ? { mensaje: 'Este usuario ya no existe.' } : detail.error}
          onRetry={detail.error.status === 404 ? undefined : detail.reload}
        />
      </>
    )
  }

  return (
    <>
      <DialogHeader className="flex items-center gap-4 space-y-0">
        <Avatar name={u.nombre} src={u.urlFoto} className="size-14 text-subtitle" />
        <div className="min-w-0">
          <DialogTitle className="truncate">{u.nombre}</DialogTitle>
          <DialogDescription className="truncate">{u.email}</DialogDescription>
        </div>
      </DialogHeader>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-card bg-pale-oak/20 p-4 text-small">
        <div>
          <dt className="text-muted-foreground">Teléfono</dt>
          <dd className="mt-1 font-medium text-evergreen">{u.telefono || 'Sin registrar'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Registro</dt>
          <dd className="mt-1 font-medium text-evergreen">{formatDate(u.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado</dt>
          <dd className="mt-1">
            <StatusBadge activo={u.activo} />
          </dd>
        </div>
      </dl>

      {isSelf ? (
        <Alert variant="info" className="mt-6">
          <p>No puedes cambiar tu propio rol ni desactivar tu cuenta.</p>
        </Alert>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rol-usuario">Rol</Label>
            <div className="flex gap-2">
              <Select
                id="rol-usuario"
                className="flex-1"
                value={selectedRol}
                onChange={(e) => {
                  setRol(e.target.value)
                  setError(null)
                }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Button onClick={handleRole} loading={saving} disabled={selectedRol === u.rol}>
                Cambiar rol
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="error">
              <p>{error.mensaje}</p>
            </Alert>
          )}

          {promoted && (
            <Alert variant="info">
              <p>
                El rol no lo convierte en agente automáticamente. Registra su ficha de agente indicando su oficina
                {promoted === 'GERENTE_OFICINA' && ' y luego asígnalo como gerente desde Oficinas'}.
              </p>
              <Link to={`/panel/agentes?usuario=${userId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Registrar como agente
              </Link>
            </Alert>
          )}

          <div className="flex flex-col gap-3 border-t border-ash-grey/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-small text-muted-foreground">
              {u.activo ? 'Un usuario desactivado no puede iniciar sesión.' : 'Al activarlo podrá volver a iniciar sesión.'}
            </p>
            <Button variant={u.activo ? 'outline' : 'default'} size="sm" onClick={() => setConfirmStatus(true)} className={cn(u.activo && 'border-error/40 text-error hover:border-error hover:bg-error/5')}>
              {u.activo ? 'Desactivar usuario' : 'Activar usuario'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={u.activo ? `Desactivar a ${u.nombre}` : `Activar a ${u.nombre}`}
        description={
          u.activo
            ? 'No podrá iniciar sesión hasta que lo vuelvas a activar. Sus datos se conservan.'
            : 'Podrá volver a iniciar sesión con su cuenta.'
        }
        confirmLabel={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
        destructive={u.activo}
        onConfirm={handleStatus}
      />
    </>
  )
}
