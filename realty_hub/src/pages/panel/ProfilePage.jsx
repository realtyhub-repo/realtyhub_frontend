import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { updateMe } from '@/api/userApi'
import { ROLE_LABELS, useAuth } from '@/auth/auth-context'
import { Field } from '@/components/auth/Field'
import { PageHeader } from '@/components/panel/PageHeader'
import { ListSkeleton, LoadError } from '@/components/panel/States'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { changedFields, formatDate } from '@/lib/format'

const toForm = (me) => ({ nombre: me?.nombre ?? '', telefono: me?.telefono ?? '', urlFoto: me?.urlFoto ?? '' })

function validate(form) {
  const errors = {}
  if (!form.nombre.trim()) errors.nombre = 'Ingresa tu nombre'
  if (form.urlFoto.trim()) {
    try {
      const url = new URL(form.urlFoto.trim())
      if (!/^https?:$/.test(url.protocol)) throw new Error()
    } catch {
      errors.urlFoto = 'Ingresa una URL válida (https://…)'
    }
  }
  if (form.telefono.trim() && !/^[+\d][\d\s()-]{5,}$/.test(form.telefono.trim())) {
    errors.telefono = 'Ingresa un teléfono válido'
  }
  return Object.keys(errors).length ? errors : null
}

/** Mi perfil: `GET /users/me` (lo carga PanelLayout) + `PUT /users/me` enviando solo lo que cambió. */
export default function ProfilePage() {
  const { me, meLoading, meError, setMe, reloadMe } = useOutletContext()
  if (meLoading && !me) return <ListSkeleton rows={3} className="max-w-3xl" />
  if (meError) return <LoadError error={meError} onRetry={reloadMe} className="max-w-3xl" />
  // `key`: el formulario se precarga con el perfil actual al montarse (docs/user-service.md §4.7).
  return <ProfileForm key={me.id} me={me} setMe={setMe} />
}

function ProfileForm({ me, setMe }) {
  const { user } = useAuth()
  const [form, setForm] = useState(() => toForm(me))
  const [errors, setErrors] = useState(null)
  const [status, setStatus] = useState(null) // { kind: 'success' | 'error' | 'info', text }
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
    setStatus(null)
  }

  const trimmed = { nombre: form.nombre.trim(), telefono: form.telefono.trim(), urlFoto: form.urlFoto.trim() }
  // Un campo vaciado no se envía: null significa "no cambiar" y el backend no permite borrarlo.
  const changes = Object.fromEntries(Object.entries(changedFields(toForm(me), trimmed)).filter(([, v]) => v !== ''))
  const clearedFields = Object.keys(trimmed).filter((k) => trimmed[k] === '' && me[k])
  const dirty = Object.keys(changes).length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (errs) return
    if (!dirty) {
      setStatus({ kind: 'info', text: 'No hay cambios por guardar.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      // `nombre` es obligatorio en ActualizarPerfilRequest: se envía siempre (sin cambio no altera nada).
      await updateMe({ nombre: trimmed.nombre, ...changes })
      setMe((prev) => ({ ...prev, ...changes }))
      setStatus({ kind: 'success', text: 'Perfil actualizado.' })
    } catch (err) {
      setStatus({ kind: 'error', text: err.mensaje })
    } finally {
      setSaving(false)
    }
  }

  const roleChanged = me.rol && me.rol !== user.rol

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader title="Mi perfil" description="Tu nombre y foto se muestran a tu equipo; si eres agente, tu nombre también aparece en tu ficha pública." />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={trimmed.nombre || me.nombre} src={errors?.urlFoto ? null : trimmed.urlFoto} className="size-16 text-subtitle" key={trimmed.urlFoto} />
            <div className="min-w-0">
              <p className="truncate font-display text-subtitle font-semibold text-evergreen">{trimmed.nombre || me.nombre}</p>
              <p className="truncate text-small text-muted-foreground">{me.email}</p>
            </div>
          </div>

          <Field id="nombre" label="Nombre" error={errors?.nombre}>
            {(p) => <Input {...p} value={form.nombre} onChange={update('nombre')} autoComplete="name" maxLength={120} />}
          </Field>
          <Field
            id="telefono"
            label="Teléfono"
            error={errors?.telefono}
            hint={<p className="text-small text-muted-foreground">Incluye el código de país, por ejemplo +51 987654321.</p>}
          >
            {(p) => <Input {...p} type="tel" value={form.telefono} onChange={update('telefono')} autoComplete="tel" placeholder="+51 987654321" />}
          </Field>
          <Field
            id="urlFoto"
            label="URL de la foto"
            error={errors?.urlFoto}
            hint={<p className="text-small text-muted-foreground">Enlace público a una imagen cuadrada.</p>}
          >
            {(p) => <Input {...p} type="url" value={form.urlFoto} onChange={update('urlFoto')} placeholder="https://" />}
          </Field>

          {clearedFields.length > 0 && (
            <Alert variant="warning">
              <p>Los campos vacíos no se borran: se conserva el valor que ya tenías.</p>
            </Alert>
          )}
          {status && (
            <Alert variant={status.kind}>
              <p>{status.text}</p>
            </Alert>
          )}

          <div className="flex gap-2 border-t border-ash-grey/50 pt-6">
            <Button type="submit" loading={saving} disabled={!dirty}>
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || (!dirty && !clearedFields.length)}
              onClick={() => {
                setForm(toForm(me))
                setErrors(null)
                setStatus(null)
              }}
            >
              Descartar
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-card bg-pale-oak/25 p-6">
          <h2 className="text-body font-semibold text-evergreen">Cuenta</h2>
          <dl className="mt-4 space-y-4 text-small">
            <div>
              <dt className="text-muted-foreground">Correo</dt>
              <dd className="mt-1 break-all font-medium text-evergreen">{me.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rol</dt>
              <dd className="mt-1 font-medium text-evergreen">{ROLE_LABELS[me.rol] ?? me.rol}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="mt-1">
                <Badge variant={me.activo ? 'success' : 'error'} dot>
                  {me.activo ? 'Activa' : 'Desactivada'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Id de usuario</dt>
              <dd className="mt-1 flex items-start gap-2">
                <span className="min-w-0 break-all font-mono text-meta text-evergreen">{me.id}</span>
                <CopyButton value={me.id} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Miembro desde</dt>
              <dd className="mt-1 font-medium text-evergreen">{formatDate(me.createdAt, { dateStyle: 'long' })}</dd>
            </div>
          </dl>
          {roleChanged && (
            <p className="mt-6 border-t border-evergreen/10 pt-4 text-meta text-muted-foreground">
              Tu rol cambió recientemente. Los nuevos permisos se aplican al renovar tu sesión o al volver a ingresar.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

/** Copia el id: el gerente lo necesita para registrar a alguien como agente. */
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])
  const Icon = copied ? Check : Copy
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => setCopied(true), () => {})}
      className="shrink-0 rounded-control p-1 text-muted-foreground transition-colors duration-150 hover:bg-pale-oak/40 hover:text-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={copied ? 'Id copiado' : 'Copiar id'}
      title={copied ? 'Id copiado' : 'Copiar id'}
    >
      <Icon key={String(copied)} className="size-3.5 animate-pop" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
