import { Building2, Check, House, KeyRound, Tag } from 'lucide-react'
import { useState } from 'react'
import { MODALIDADES, TIPOS_PROPIEDAD } from '@/api/propertyApi'
import { Field } from '@/components/auth/Field'
import { LocationPicker } from '@/components/map/LocationPicker'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  CARACTERISTICAS,
  MODALIDAD_FRASE,
  MODALIDAD_LABELS,
  TIPO_LABELS,
  digitsOnly,
  groupDigits,
} from '@/lib/property'
import { cn } from '@/lib/utils'
import { compactErrors, coordsError } from '@/lib/validation'

const LIMITS = { titulo: 150, descripcion: 2000, direccion: 255, ciudad: 100 }
const TIPO_ICONS = { CASA: House, APARTAMENTO: Building2 }
const MODALIDAD_ICONS = { VENTA: Tag, ALQUILER: KeyRound }

/* ------------------------------------------------------------------ */
/* Conversión entre el JSON de `caracteristicas` y el estado del form */
/* ------------------------------------------------------------------ */

/** Valores del JSON → texto de los campos ("85.5" se muestra como "85,5"; dinero con separador de miles). */
function toDraft(caracteristicas, tipo) {
  const c = caracteristicas ?? {}
  return Object.fromEntries(
    (CARACTERISTICAS[tipo] ?? []).map((f) => {
      const v = c[f.key]
      if (f.type === 'bool') return [f.key, v === true]
      if (typeof v !== 'number') return [f.key, '']
      if (f.type === 'money') return [f.key, String(Math.round(v))]
      return [f.key, String(v).replace('.', ',')]
    }),
  )
}

function parseNumber(text) {
  const t = String(text).trim().replace(/\s/g, '').replace(',', '.')
  return t === '' ? null : Number(t)
}

/**
 * Texto de los campos → JSON. Omite vacíos y los "no" (un booleano solo se guarda si es verdadero).
 * Conserva las claves que no pertenecen al catálogo del tipo: `caracteristicas` se reemplaza entero al
 * editar (docs §4.4), así que borrar lo que este frontend no conoce sería perder datos.
 */
function fromDraft(draft, tipo, original) {
  const known = new Set((CARACTERISTICAS[tipo] ?? []).map((f) => f.key))
  const out = Object.fromEntries(Object.entries(original ?? {}).filter(([k]) => !known.has(k)))
  for (const f of CARACTERISTICAS[tipo] ?? []) {
    const v = draft[f.key]
    if (f.type === 'bool') {
      if (v) out[f.key] = true
    } else if (f.type === 'money') {
      if (v) out[f.key] = Number(v)
    } else {
      const n = parseNumber(v)
      if (n !== null) out[f.key] = n
    }
  }
  return out
}

function validateCaracteristica(f, raw) {
  if (f.type === 'bool') return null
  const n = f.type === 'money' ? (raw ? Number(raw) : null) : parseNumber(raw)
  if (n === null) return f.required ? `Ingresa ${f.label.toLowerCase()}` : null
  if (!Number.isFinite(n)) return 'Ingresa un número válido'
  if (f.type === 'int' && !Number.isInteger(n)) return 'Debe ser un número entero'
  if (f.min !== undefined && n < f.min) return `Mínimo ${f.min}`
  if (f.max !== undefined && n > f.max) return `Máximo ${f.max}`
  return null
}

/** JSON estable (claves ordenadas) para comparar `caracteristicas` sin importar el orden. */
function stable(obj) {
  return JSON.stringify(Object.keys(obj ?? {}).sort().map((k) => [k, obj[k]]))
}

/**
 * Formulario de propiedad para crear (`initial` = null) y editar (`initial` = detalle).
 * - Crear: envía todo, incluidos tipo y modalidad (solo se fijan aquí, docs §4.3).
 * - Editar: precarga los valores y envía solo lo que cambió; `caracteristicas` completo si cambió (docs §4.8).
 * `onSubmit(payload)` es async; si lanza un ApiError se muestra arriba del pie del formulario.
 */
export function PropertyForm({ initial, onSubmit, onCancel, submitLabel, savingLabel }) {
  const editing = !!initial
  const [tipo, setTipo] = useState(initial?.tipoPropiedad ?? '')
  const [modalidad, setModalidad] = useState(initial?.modalidad ?? '')
  const [form, setForm] = useState({
    titulo: initial?.titulo ?? '',
    descripcion: initial?.descripcion ?? '',
    precio: initial?.precio ? String(Math.round(initial.precio)) : '',
    ciudad: initial?.ciudad ?? '',
    direccion: initial?.direccion ?? '',
  })
  const [caract, setCaract] = useState(() => toDraft(initial?.caracteristicas, initial?.tipoPropiedad))
  const [coords, setCoords] = useState(
    initial && Number.isFinite(initial.latitud) ? { latitud: initial.latitud, longitud: initial.longitud } : null,
  )
  const [errors, setErrors] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  const clearError = (key) => setErrors((e) => (e?.[key] ? { ...e, [key]: null } : e))

  const update = (key) => (e) => {
    const value = key === 'precio' ? digitsOnly(e.target.value).slice(0, 13) : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    clearError(key)
    setNotice(null)
  }

  function chooseTipo(t) {
    // Cambiar de tipo cambia el catálogo de características: se conservan las que ambos comparten.
    setCaract((prev) => ({ ...toDraft(null, t), ...Object.fromEntries(Object.entries(prev).filter(([k]) => CARACTERISTICAS[t].some((f) => f.key === k))) }))
    setTipo(t)
    clearError('tipo')
  }

  function validate() {
    const e = {
      tipo: !editing && !tipo ? 'Elige el tipo de propiedad' : null,
      modalidad: !editing && !modalidad ? 'Elige si es para venta o alquiler' : null,
      titulo: !form.titulo.trim() ? 'Ingresa un título' : null,
      descripcion: !form.descripcion.trim() ? 'Describe la propiedad' : null,
      precio: !form.precio || Number(form.precio) <= 0 ? 'Ingresa el precio' : null,
      ciudad: !form.ciudad.trim() ? 'Ingresa la ciudad' : null,
      direccion: !form.direccion.trim() ? 'Ingresa la dirección' : null,
      coords: coordsError(coords, 'Marca la ubicación de la propiedad en el mapa'),
    }
    for (const f of CARACTERISTICAS[tipo] ?? []) e[`c_${f.key}`] = validateCaracteristica(f, caract[f.key])
    return compactErrors(e)
  }

  function buildPayload() {
    const base = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio),
      ciudad: form.ciudad.trim(),
      direccion: form.direccion.trim(),
      latitud: coords.latitud,
      longitud: coords.longitud,
      caracteristicas: fromDraft(caract, tipo, initial?.caracteristicas),
    }
    if (!editing) return { ...base, tipoPropiedad: tipo, modalidad }

    // Solo lo que cambió (docs §4.8). Un texto en blanco nunca se envía como "" (no borra en el backend).
    const changes = {}
    for (const key of ['titulo', 'descripcion', 'precio', 'ciudad', 'direccion', 'latitud', 'longitud']) {
      if (base[key] !== initial[key]) changes[key] = base[key]
    }
    if (stable(base.caracteristicas) !== stable(initial.caracteristicas)) changes.caracteristicas = base.caracteristicas
    return changes
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    setError(null)
    if (errs) {
      // Llevar a la persona al primer campo con error.
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    const payload = buildPayload()
    if (editing && Object.keys(payload).length === 0) {
      setNotice('No hay cambios para guardar.')
      return
    }
    setSaving(true)
    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const fields = CARACTERISTICAS[tipo] ?? []

  return (
    <form onSubmit={handleSubmit} noValidate className="divide-y divide-ash-grey/50">
      <Section
        title="Tipo de negocio"
        text={editing ? 'El tipo y la modalidad se fijan al publicar y no se pueden cambiar.' : 'Define qué campos se piden en las características. No se podrá cambiar después.'}
      >
        {editing ? (
          <p className="flex items-center gap-3 rounded-card border border-ash-grey/60 px-4 py-3">
            {(() => {
              const Icon = TIPO_ICONS[tipo] ?? House
              return <Icon className="size-5 text-evergreen" strokeWidth={1.5} aria-hidden="true" />
            })()}
            <span className="font-medium text-evergreen">
              {TIPO_LABELS[tipo]} {MODALIDAD_FRASE[modalidad]}
            </span>
          </p>
        ) : (
          <div className="space-y-6">
            <ChoiceGroup
              label="Tipo de propiedad"
              options={TIPOS_PROPIEDAD.map((t) => ({ value: t, label: TIPO_LABELS[t], icon: TIPO_ICONS[t] }))}
              value={tipo}
              onChange={chooseTipo}
              error={errors?.tipo}
            />
            <ChoiceGroup
              label="Modalidad"
              options={MODALIDADES.map((m) => ({ value: m, label: MODALIDAD_LABELS[m], icon: MODALIDAD_ICONS[m] }))}
              value={modalidad}
              onChange={(m) => {
                setModalidad(m)
                clearError('modalidad')
              }}
              error={errors?.modalidad}
            />
          </div>
        )}
      </Section>

      <Section title="Información" text="Lo primero que ve un interesado en el catálogo: título, precio y una descripción honesta.">
        <div className="space-y-5">
          <Field id="pf-titulo" label="Título" error={errors?.titulo} action={<Counter value={form.titulo} max={LIMITS.titulo} />}>
            {(p) => <Input {...p} value={form.titulo} onChange={update('titulo')} maxLength={LIMITS.titulo} placeholder="Casa de dos niveles con patio en El Poblado" />}
          </Field>
          <Field
            id="pf-precio"
            label={modalidad === 'ALQUILER' ? 'Canon mensual' : 'Precio de venta'}
            error={errors?.precio}
            hint={<p className="text-meta text-muted-foreground">En pesos colombianos, sin decimales.</p>}
          >
            {(p) => (
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                  $
                </span>
                <Input {...p} inputMode="numeric" value={groupDigits(form.precio)} onChange={update('precio')} placeholder="350.000.000" className="pl-7 tabular-nums" />
              </div>
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="pf-ciudad" label="Ciudad" error={errors?.ciudad}>
              {(p) => <Input {...p} value={form.ciudad} onChange={update('ciudad')} maxLength={LIMITS.ciudad} placeholder="Medellín" />}
            </Field>
            <Field id="pf-direccion" label="Dirección" error={errors?.direccion}>
              {(p) => <Input {...p} value={form.direccion} onChange={update('direccion')} maxLength={LIMITS.direccion} placeholder="Calle 10 # 43-12" />}
            </Field>
          </div>
          <Field id="pf-descripcion" label="Descripción" error={errors?.descripcion} action={<Counter value={form.descripcion} max={LIMITS.descripcion} />}>
            {(p) => (
              <Textarea
                {...p}
                rows={7}
                value={form.descripcion}
                onChange={update('descripcion')}
                maxLength={LIMITS.descripcion}
                placeholder="Espacios, acabados, iluminación, entorno y lo que hace distinta a esta propiedad."
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Características"
        text={tipo ? 'Habitaciones, baños y área son obligatorios; el resto es opcional. Se muestran en la ficha pública.' : 'Elige primero el tipo de propiedad.'}
      >
        {fields.length === 0 ? (
          <p className="rounded-card border border-dashed border-ash-grey px-4 py-6 text-small text-muted-foreground">
            Las características dependen de si es casa o apartamento.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {fields
                .filter((f) => f.type !== 'bool')
                .map((f) => (
                  <Field key={f.key} id={`pf-c-${f.key}`} label={f.required ? f.label : `${f.label} (opcional)`} error={errors?.[`c_${f.key}`]}>
                    {(p) => (
                      <NumberInput
                        {...p}
                        field={f}
                        value={caract[f.key] ?? ''}
                        onChange={(v) => {
                          setCaract((c) => ({ ...c, [f.key]: v }))
                          clearError(`c_${f.key}`)
                          setNotice(null)
                        }}
                      />
                    )}
                  </Field>
                ))}
            </div>
            <div role="group" aria-label="Comodidades" className="flex flex-wrap gap-2">
              {fields
                .filter((f) => f.type === 'bool')
                .map((f) => {
                  const on = !!caract[f.key]
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setCaract((c) => ({ ...c, [f.key]: !on }))
                        setNotice(null)
                      }}
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'border-evergreen bg-evergreen text-floral-white' : 'border-ash-grey text-evergreen hover:border-evergreen hover:bg-pale-oak/25',
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={2} aria-hidden="true" />}
                      {f.label}
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Ubicación"
        text="Con estas coordenadas se asignan los interesados a la oficina más cercana: verifica que el pin quede sobre la propiedad."
      >
        <LocationPicker
          coords={coords}
          onPick={(c) => {
            setCoords(c)
            clearError('coords')
            setNotice(null)
          }}
          error={errors?.coords}
          label="Ubicación de la propiedad"
          hint="Haz clic en el mapa para marcar la propiedad."
        />
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-ash-grey/50 bg-floral-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        {(error || notice) && (
          <div className="mb-3">
            {error ? (
              <Alert variant="error">
                <p>{error.status === 403 ? 'No tienes permiso para realizar esta acción.' : error.mensaje}</p>
              </Alert>
            ) : (
              <Alert variant="info">
                <p>{notice}</p>
              </Alert>
            )}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {saving ? (savingLabel ?? submitLabel) : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** Sección de formulario a dos columnas: explicación a la izquierda, campos a la derecha. */
function Section({ title, text, children }) {
  return (
    <section className="grid gap-6 py-8 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      <div className="space-y-1">
        <h2 className="text-subtitle leading-tight text-evergreen">{title}</h2>
        {text && <p className="max-w-[40ch] text-small text-muted-foreground">{text}</p>}
      </div>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </section>
  )
}

/** Opciones grandes tipo tarjeta (radio). */
function ChoiceGroup({ label, options, value, onChange, error }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-small font-medium text-evergreen">{label}</legend>
      <div role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined} className="grid max-w-md grid-cols-2 gap-3">
        {options.map(({ value: v, label: l, icon: Icon }) => {
          const selected = value === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(v)}
              className={cn(
                'flex items-center gap-3 rounded-card border px-4 py-4 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-evergreen bg-pale-oak/25 shadow-[inset_0_0_0_1px_var(--evergreen)]'
                  : cn('hover:border-evergreen/50 hover:bg-pale-oak/10', error ? 'border-error' : 'border-ash-grey/70'),
              )}
            >
              <Icon className={cn('size-5', selected ? 'text-evergreen' : 'text-ash-grey')} strokeWidth={1.5} aria-hidden="true" />
              <span className="font-medium text-evergreen">{l}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="animate-alert-in text-small text-error">{error}</p>}
    </fieldset>
  )
}

function NumberInput({ field, value, onChange, ...props }) {
  if (field.type === 'money') {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
          $
        </span>
        <Input {...props} inputMode="numeric" value={groupDigits(value)} onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 12))} className="pl-7 tabular-nums" />
      </div>
    )
  }
  return (
    <div className="relative">
      <Input
        {...props}
        inputMode={field.type === 'int' ? 'numeric' : 'decimal'}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(field.type === 'int' ? /[^\d]/g : /[^\d.,]/g, '').slice(0, 10))}
        className={cn('tabular-nums', field.unit && 'pr-10')}
      />
      {field.unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-small text-muted-foreground" aria-hidden="true">
          {field.unit}
        </span>
      )}
    </div>
  )
}

function Counter({ value, max }) {
  const near = value.length > max * 0.9
  return (
    <span className={cn('text-meta tabular-nums', near ? 'text-warning' : 'text-muted-foreground')}>
      {value.length}/{max}
    </span>
  )
}
