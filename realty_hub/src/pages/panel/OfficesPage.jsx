import { Building, CornerDownRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { asignarGerente, listOficinas, listUsers, quitarGerente } from '@/api/userApi'
import { OfficeMap } from '@/components/map/OfficeMap'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { OfficeFormDialog } from '@/components/panel/OfficeFormDialog'
import { PageHeader } from '@/components/panel/PageHeader'
import { EmptyState, ListSkeleton, LoadError } from '@/components/panel/States'
import { useToast } from '@/components/panel/Toast'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'

/** Ordena centrales por nombre y coloca debajo de cada una sus sucursales (solo hay dos niveles). */
function toTree(oficinas) {
  const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es')
  const centrales = oficinas.filter((o) => o.tipo === 'CENTRAL').sort(byName)
  const rows = []
  for (const c of centrales) {
    rows.push({ office: c, depth: 0 })
    oficinas
      .filter((o) => o.oficinaCentralId === c.id)
      .sort(byName)
      .forEach((s) => rows.push({ office: s, depth: 1 }))
  }
  // Sucursales cuya central no vino en la lista (no debería pasar): al final, sin anidar.
  const placed = new Set(rows.map((r) => r.office.id))
  oficinas.filter((o) => !placed.has(o.id)).sort(byName).forEach((o) => rows.push({ office: o, depth: 0 }))
  return rows
}

/** Gestión de oficinas (ADMINISTRADOR_CENTRAL): crear, editar con mapa, asignar y quitar gerente. */
export default function OfficesPage() {
  const oficinas = useAsync((signal) => listOficinas({ signal }), [])
  // Gerentes: para mostrar su nombre y elegir a quién asignar.
  const gerentes = useAsync((signal) => listUsers({ rol: 'GERENTE_OFICINA', signal }), [])
  const [activeId, setActiveId] = useState(null)
  const [form, setForm] = useState({ open: false, office: null })
  const [assigning, setAssigning] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [toast, showToast] = useToast()

  const list = useMemo(() => oficinas.data ?? [], [oficinas.data])
  const rows = useMemo(() => toTree(list), [list])
  const centrales = useMemo(() => list.filter((o) => o.tipo === 'CENTRAL'), [list])
  const gerenteById = useMemo(() => new Map((gerentes.data ?? []).map((g) => [g.id, g])), [gerentes.data])
  const nameOf = (id) => list.find((o) => o.id === id)?.nombre

  function upsert(saved, message) {
    oficinas.setData((prev) => {
      const items = prev ?? []
      return items.some((o) => o.id === saved.id) ? items.map((o) => (o.id === saved.id ? saved : o)) : [...items, saved]
    })
    setForm({ open: false, office: null })
    setActiveId(saved.id)
    showToast(message)
  }

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        title="Oficinas"
        description="Centrales y sucursales con su ubicación. Las coordenadas se usan para asignar clientes al agente más cercano."
        actions={
          <Button onClick={() => setForm({ open: true, office: null })}>
            <Plus strokeWidth={1.75} aria-hidden="true" />
            Nueva oficina
          </Button>
        }
      />

      {oficinas.error ? (
        <LoadError error={oficinas.error} onRetry={oficinas.reload} />
      ) : oficinas.loading && !oficinas.data ? (
        <ListSkeleton rows={5} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Aún no hay oficinas registradas"
          text="Empieza por una oficina central; después podrás agregar sus sucursales."
          action={
            <Button size="sm" onClick={() => setForm({ open: true, office: null })}>
              Crear oficina
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-card border border-ash-grey/60">
            <table className="w-full text-left text-small">
              <thead className="border-b border-ash-grey/60 bg-pale-oak/15 text-meta text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Oficina</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Gerente</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-grey/40">
                {rows.map(({ office: o, depth }) => {
                  const gerente = o.gerenteId ? gerenteById.get(o.gerenteId) : null
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setActiveId(o.id)}
                      className={cn('cursor-pointer transition-colors duration-150 hover:bg-pale-oak/10', activeId === o.id && 'bg-pale-oak/15')}
                    >
                      <td className="px-5 py-3">
                        <div className={cn('flex items-start gap-2', depth && 'pl-6')}>
                          {depth > 0 && <CornerDownRight className="mt-0.5 size-4 shrink-0 text-ash-grey" strokeWidth={1.5} aria-hidden="true" />}
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-evergreen">{o.nombre}</span>
                              {o.tipo === 'CENTRAL' && <Badge variant="neutral">Central</Badge>}
                            </p>
                            <p className="text-meta text-muted-foreground">
                              {o.region}
                              {depth === 0 && o.tipo === 'SUCURSAL' && ` · Sucursal de ${nameOf(o.oficinaCentralId) ?? 'central desconocida'}`}
                            </p>
                            <p className="mt-1 text-meta md:hidden">
                              <ManagerLabel id={o.gerenteId} gerente={gerente} />
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 md:table-cell">
                        <ManagerLabel id={o.gerenteId} gerente={gerente} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, office: o })}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setAssigning(o)}>
                            {o.gerenteId ? 'Cambiar gerente' : 'Asignar gerente'}
                          </Button>
                          {o.gerenteId && (
                            <Button variant="ghost" size="sm" className="text-error hover:bg-error/5" onClick={() => setRemoving(o)}>
                              Quitar gerente
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="border-t border-ash-grey/40 px-5 py-3 text-meta text-muted-foreground">
              {centrales.length} {centrales.length === 1 ? 'central' : 'centrales'} · {list.length - centrales.length}{' '}
              {list.length - centrales.length === 1 ? 'sucursal' : 'sucursales'}
              {gerentes.error && ' · No se pudieron cargar los nombres de los gerentes'}
            </p>
          </div>

          <div className="space-y-2 xl:sticky xl:top-24 xl:self-start">
            <OfficeMap offices={list} activeId={activeId} onSelect={setActiveId} className="h-80 rounded-card border border-ash-grey/60 xl:h-[480px]" />
            <p className="text-meta text-muted-foreground">
              Así se ve en el{' '}
              <Link to="/oficinas" className="font-medium text-emerald-depths hover:text-evergreen hover:underline">
                directorio público
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <OfficeFormDialog
        open={form.open}
        office={form.office}
        centrales={centrales}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        onSaved={upsert}
      />

      <AssignManagerDialog
        office={assigning}
        oficinas={list}
        gerentes={gerentes}
        onClose={() => setAssigning(null)}
        onAssigned={(officeId, gerenteId) => {
          oficinas.setData((prev) => prev.map((o) => (o.id === officeId ? { ...o, gerenteId } : o)))
          setAssigning(null)
          showToast('Gerente asignado')
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={removing ? `Quitar gerente de ${removing.nombre}` : ''}
        description="La oficina quedará sin gerente. La persona conserva su rol y podrá dirigir otra oficina."
        confirmLabel="Quitar gerente"
        destructive
        onConfirm={async () => {
          await quitarGerente(removing.id)
          oficinas.setData((prev) => prev.map((o) => (o.id === removing.id ? { ...o, gerenteId: null } : o)))
          showToast('Gerente quitado')
        }}
      />
      {toast}
    </div>
  )
}

function ManagerLabel({ id, gerente }) {
  if (!id) return <span className="text-muted-foreground">Sin gerente</span>
  return <span className="text-evergreen">{gerente?.nombre ?? 'Gerente asignado'}</span>
}

/** `PUT /oficinas/{id}/gerente`: solo usuarios GERENTE_OFICINA que no dirijan otra oficina. */
function AssignManagerDialog({ office, oficinas, gerentes, onClose, onAssigned }) {
  const [gerenteId, setGerenteId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const managing = useMemo(() => new Map(oficinas.filter((o) => o.gerenteId).map((o) => [o.gerenteId, o])), [oficinas])
  const options = useMemo(
    () => [...(gerentes.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [gerentes.data],
  )

  function close() {
    if (saving) return
    setGerenteId('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!gerenteId) {
      setError({ mensaje: 'Elige a un gerente.' })
      return
    }
    setSaving(true)
    setError(null)
    try {
      await asignarGerente(office.id, gerenteId)
      onAssigned(office.id, gerenteId)
      setGerenteId('')
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!office} onOpenChange={(v) => !v && close()}>
      <DialogContent>
        {office && (
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Gerente de {office.nombre}</DialogTitle>
              <DialogDescription>
                {office.gerenteId
                  ? 'Al asignar a otra persona, reemplaza al gerente actual.'
                  : 'Solo aparecen usuarios con rol de gerente de oficina.'}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-2">
              <Label htmlFor="gerente">Gerente</Label>
              {gerentes.loading ? (
                <span className="block h-11 animate-pulse rounded-control bg-pale-oak/30" />
              ) : gerentes.error ? (
                <LoadError error={gerentes.error} onRetry={gerentes.reload} />
              ) : options.length === 0 ? (
                <p className="text-small text-muted-foreground">
                  No hay usuarios con rol de gerente. Cambia el rol de alguien desde{' '}
                  <Link to="/panel/usuarios" className="font-medium text-emerald-depths hover:underline">
                    Usuarios
                  </Link>
                  .
                </p>
              ) : (
                <Select id="gerente" value={gerenteId} onChange={(e) => setGerenteId(e.target.value)}>
                  <option value="">Elige un gerente</option>
                  {options.map((g) => {
                    const other = managing.get(g.id)
                    const current = other?.id === office.id
                    return (
                      <option key={g.id} value={g.id} disabled={!!other || !g.activo}>
                        {g.nombre}
                        {current ? ' (actual)' : other ? ` (dirige ${other.nombre})` : !g.activo ? ' (desactivado)' : ''}
                      </option>
                    )
                  })}
                </Select>
              )}
              <p className="text-meta text-muted-foreground">
                Quien ya dirige otra oficina debe ser retirado de ella antes de poder asignarlo aquí.
              </p>
            </div>

            {error && (
              <Alert variant="error" className="mt-6">
                <p>{error.mensaje}</p>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving} disabled={!options.length}>
                Asignar gerente
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
