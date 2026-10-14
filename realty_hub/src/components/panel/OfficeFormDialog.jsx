import { useState } from 'react'
import { createOficina, updateOficina } from '@/api/userApi'
import { Field } from '@/components/auth/Field'
import { LocationPicker } from '@/components/map/LocationPicker'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { coordsError } from '@/lib/validation'

/**
 * Crear (`POST /oficinas`) o editar (`PUT /oficinas/{id}`) una oficina.
 * Al editar: tipo y central no se pueden cambiar; solo se envía lo que cambió y las coordenadas
 * cuentan como cambiadas solo si se movió el pin (docs/user-service.md §4.7).
 */
export function OfficeFormDialog({ open, onOpenChange, office, centrales, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-32px)] max-w-3xl overflow-y-auto">
        {open && <OfficeForm key={office?.id ?? 'new'} office={office} centrales={centrales} onSaved={onSaved} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function OfficeForm({ office, centrales, onSaved, onCancel }) {
  const editing = !!office
  const [form, setForm] = useState({
    nombre: office?.nombre ?? '',
    region: office?.region ?? '',
    tipo: office?.tipo ?? 'CENTRAL',
    oficinaCentralId: office?.oficinaCentralId ?? '',
  })
  const [coords, setCoords] = useState(office ? { latitud: office.latitud, longitud: office.longitud } : null)
  const [moved, setMoved] = useState(false)
  const [errors, setErrors] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
  }

  function pick(next) {
    setCoords(next)
    setMoved(true)
    setErrors((errs) => (errs ? { ...errs, coords: null } : errs))
  }

  function validate() {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Ingresa el nombre de la oficina'
    if (!form.region.trim()) errs.region = 'Ingresa la región o ciudad'
    if (!editing && form.tipo === 'SUCURSAL' && !form.oficinaCentralId) errs.oficinaCentralId = 'Elige la oficina central'
    const coordsErr = coordsError(coords)
    if (coordsErr) errs.coords = coordsErr
    return Object.keys(errs).length ? errs : null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs) return

    const nombre = form.nombre.trim()
    const region = form.region.trim()
    setError(null)

    if (editing) {
      const changes = {}
      if (nombre !== office.nombre) changes.nombre = nombre
      if (region !== office.region) changes.region = region
      if (moved && (coords.latitud !== office.latitud || coords.longitud !== office.longitud)) {
        changes.latitud = coords.latitud
        changes.longitud = coords.longitud
      }
      if (!Object.keys(changes).length) {
        onCancel()
        return
      }
      // El backend exige al menos `nombre` o `region` en el body.
      if (!changes.nombre && !changes.region) changes.nombre = nombre
      setSaving(true)
      try {
        const saved = await updateOficina(office.id, changes)
        onSaved(saved, 'Oficina actualizada')
      } catch (err) {
        setError(err)
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      const saved = await createOficina({
        nombre,
        region,
        latitud: coords.latitud,
        longitud: coords.longitud,
        tipo: form.tipo,
        ...(form.tipo === 'SUCURSAL' ? { oficinaCentralId: form.oficinaCentralId } : {}),
      })
      onSaved(saved, 'Oficina creada')
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const central = centrales.find((c) => c.id === (office?.oficinaCentralId ?? form.oficinaCentralId))

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? `Editar ${office.nombre}` : 'Nueva oficina'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'El tipo de oficina y su central no se pueden cambiar.'
            : 'Se crea sin gerente; podrás asignarlo después.'}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <Field id="of-nombre" label="Nombre" error={errors?.nombre}>
            {(p) => <Input {...p} value={form.nombre} onChange={update('nombre')} placeholder="Oficina Centro" />}
          </Field>
          <Field id="of-region" label="Región o ciudad" error={errors?.region}>
            {(p) => <Input {...p} value={form.region} onChange={update('region')} placeholder="Montería" />}
          </Field>

          {editing ? (
            <dl className="rounded-control bg-pale-oak/20 px-4 py-3 text-small">
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium text-evergreen">
                {office.tipo === 'CENTRAL' ? 'Central' : `Sucursal de ${central?.nombre ?? 'una central'}`}
              </dd>
            </dl>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-small font-medium text-evergreen">Tipo</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['CENTRAL', 'Central', 'Independiente'],
                    ['SUCURSAL', 'Sucursal', 'Depende de una central'],
                  ].map(([value, label, help]) => (
                    <label
                      key={value}
                      className={cn(
                        'cursor-pointer rounded-control border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        form.tipo === value ? 'border-evergreen bg-pale-oak/25' : 'border-ash-grey hover:border-emerald-depths/60',
                      )}
                    >
                      <input type="radio" name="tipo" value={value} checked={form.tipo === value} onChange={update('tipo')} className="sr-only" />
                      <span className="block text-small font-medium text-evergreen">{label}</span>
                      <span className="block text-meta text-muted-foreground">{help}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.tipo === 'SUCURSAL' && (
                <Field id="of-central" label="Oficina central" error={errors?.oficinaCentralId}>
                  {(p) =>
                    centrales.length ? (
                      <Select {...p} value={form.oficinaCentralId} onChange={update('oficinaCentralId')}>
                        <option value="">Elige una central</option>
                        {centrales.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} · {c.region}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <p className="text-small text-muted-foreground">Primero crea una oficina central.</p>
                    )
                  }
                </Field>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label>Ubicación</Label>
          <LocationPicker coords={coords} onPick={pick} error={errors?.coords} hint="Haz clic en el mapa para marcar la oficina." />
        </div>
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
        <Button type="submit" loading={saving}>
          {editing ? 'Guardar cambios' : 'Crear oficina'}
        </Button>
      </DialogFooter>
    </form>
  )
}
