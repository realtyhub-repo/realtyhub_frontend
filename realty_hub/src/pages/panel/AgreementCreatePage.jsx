import { addDays, subDays } from 'date-fns'
import { CircleCheck, CircleAlert, ChevronLeft, Info, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { crearAcuerdo, listAcuerdos } from '@/api/comisionApi'
import { Field } from '@/components/auth/Field'
import { CloseAgreementDialog } from '@/components/commission/CloseAgreementDialog'
import { DateField } from '@/components/commission/DateField'
import { SplitBar } from '@/components/commission/SplitBar'
import { PageHeader } from '@/components/panel/PageHeader'
import { LoadError } from '@/components/panel/States'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import {
  BASE_CALCULO_LABELS,
  BENEFICIARIO_LABELS,
  TIPOS_REGLA_OBLIGATORIOS,
  comisionErrorInfo,
  formatFechaCorta,
  formatNumero,
  hoyIso,
  parseIsoDate,
  toIsoDate,
} from '@/lib/commission'
import { TIPO_CONTRATO_LABELS } from '@/lib/contract'
import { cn } from '@/lib/utils'

const NOMBRE_MAX = 120
const FIN = '9999-12-31'
const PORCENTAJES = [
  ['porcentajeAgente', 'AGENTE'],
  ['porcentajeOficina', 'OFICINA'],
  ['porcentajeCentral', 'CENTRAL'],
]

const emptyRule = (tipo) => ({
  baseCalculo: tipo === 'ALQUILER' ? 'MESES_CANON' : 'PORCENTAJE_PRECIO',
  valor: '',
  porcentajeAgente: '',
  porcentajeOficina: '',
  porcentajeCentral: '',
})

/** Regla del acuerdo anterior como punto de partida (todo queda editable). */
function ruleFrom(r, tipo) {
  if (!r) return emptyRule(tipo)
  const s = (n) => (n === null || n === undefined ? '' : formatNumero(n).replace(/\./g, ''))
  return {
    baseCalculo: r.baseCalculo,
    valor: s(r.valor),
    porcentajeAgente: s(r.porcentajeAgente),
    porcentajeOficina: s(r.porcentajeOficina),
    porcentajeCentral: s(r.porcentajeCentral),
  }
}

/** "2,5" → 2.5; vacío o inválido → NaN. */
const num = (s) => (s === '' ? Number.NaN : Number(String(s).replace(',', '.')))

/** Solo dígitos y una coma decimal con hasta `dec` decimales. */
function decimalInput(value, dec = 2) {
  const clean = value.replace('.', ',').replace(/[^\d,]/g, '')
  const [int, ...rest] = clean.split(',')
  return rest.length ? `${int.slice(0, 3)},${rest.join('').slice(0, dec)}` : int.slice(0, 3)
}

const sumOf = (r) => PORCENTAJES.reduce((s, [k]) => s + (num(r[k]) || 0), 0)
const sumIs100 = (r) => Math.round(sumOf(r) * 100) === 10000

/** Acuerdos existentes cuya vigencia se cruza con [desde, hasta|∞]. Fechas `AAAA-MM-DD`, comparables como texto. */
function overlapping(acuerdos, desde, hasta) {
  if (!desde) return []
  return acuerdos.filter((a) => a.vigenteDesde <= (hasta || FIN) && desde <= (a.vigenteHasta || FIN))
}

/**
 * Crear un acuerdo comercial (docs/comisiones-service.md §7, solo admin). Valida antes de enviar: nombre, vigencia,
 * reglas de compraventa y alquiler (arras opcional) y reparto que sume exactamente 100. Si la vigencia se cruza con
 * un acuerdo que empezó antes, ofrece cerrarlo el día anterior al inicio del nuevo.
 */
export default function AgreementCreatePage() {
  const acuerdos = useAsync((signal) => listAcuerdos({ signal }), [])

  if (acuerdos.error && !acuerdos.data) {
    return (
      <div className="max-w-4xl space-y-6">
        <BackLink />
        <LoadError error={{ ...acuerdos.error, mensaje: comisionErrorInfo(acuerdos.error).text }} onRetry={acuerdos.reload} />
      </div>
    )
  }
  if (!acuerdos.data) {
    return (
      <div className="max-w-4xl space-y-8" role="status" aria-label="Cargando">
        <span className="block h-4 w-40 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-10 w-96 animate-pulse rounded-full bg-pale-oak/40" />
        <span className="block h-40 animate-pulse rounded-card bg-pale-oak/25" />
        <span className="block h-72 animate-pulse rounded-card bg-pale-oak/20" />
      </div>
    )
  }
  return <AgreementForm list={acuerdos.data} reload={acuerdos.reload} />
}

/** Punto de partida: reglas del acuerdo más reciente y, si tiene fin, el día siguiente como inicio. */
function initialValues(list) {
  const last = list[0]
  const hoy = hoyIso()
  if (!last) return { desde: hoy, reglas: { COMPRAVENTA: emptyRule('COMPRAVENTA'), ALQUILER: emptyRule('ALQUILER') }, arras: null }
  const by = Object.fromEntries((last.reglas ?? []).map((r) => [r.tipoContrato, r]))
  const next = last.vigenteHasta ? toIsoDate(addDays(parseIsoDate(last.vigenteHasta), 1)) : ''
  return {
    desde: next && next > hoy ? next : hoy,
    reglas: { COMPRAVENTA: ruleFrom(by.COMPRAVENTA, 'COMPRAVENTA'), ALQUILER: ruleFrom(by.ALQUILER, 'ALQUILER') },
    arras: by.ARRAS ? ruleFrom(by.ARRAS, 'ARRAS') : null,
  }
}

function AgreementForm({ list, reload }) {
  const navigate = useNavigate()
  const [initial] = useState(() => initialValues(list))
  const [nombre, setNombre] = useState('')
  const [desde, setDesde] = useState(initial.desde)
  const [hasta, setHasta] = useState('')
  const [reglas, setReglas] = useState(initial.reglas)
  const [arras, setArras] = useState(initial.arras)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)
  const [closeTarget, setCloseTarget] = useState(null)

  const cruces = overlapping(list, desde, hasta)
  const allRules = { ...reglas, ...(arras ? { ARRAS: arras } : {}) }
  const sumsOk = Object.values(allRules).every(sumIs100)

  function clearError(key) {
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
    setServerError(null)
  }

  function setRule(tipo, patch) {
    if (tipo === 'ARRAS') setArras((r) => ({ ...r, ...patch }))
    else setReglas((rs) => ({ ...rs, [tipo]: { ...rs[tipo], ...patch } }))
    clearError(tipo)
  }

  function validate() {
    const e = {}
    if (!nombre.trim()) e.nombre = 'Escribe el nombre del acuerdo'
    if (!desde) e.desde = 'Elige el día de inicio'
    if (desde && hasta && hasta < desde) e.hasta = 'No puede ser anterior al inicio'
    for (const [tipo, r] of Object.entries(allRules)) {
      const v = num(r.valor)
      if (!(v > 0)) e[tipo] = r.baseCalculo === 'MESES_CANON' ? 'Indica cuántos meses de canon' : 'Indica el porcentaje del precio'
      else if (r.baseCalculo === 'PORCENTAJE_PRECIO' && v > 100) e[tipo] = 'El porcentaje del precio no puede superar 100'
      else if (PORCENTAJES.some(([k]) => !(num(r[k]) >= 0))) e[tipo] = 'Completa los tres porcentajes del reparto'
      else if (!sumIs100(r)) e[tipo] = 'El reparto debe sumar exactamente 100 %'
    }
    return e
  }

  async function submit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.values(e).some(Boolean)) return
    if (cruces.length) {
      setServerError({ text: 'La vigencia se cruza con otro acuerdo. Cierra el acuerdo vigente primero.' })
      return
    }
    setPending(true)
    setServerError(null)
    try {
      const body = {
        nombre: nombre.trim(),
        vigenteDesde: desde,
        vigenteHasta: hasta || null,
        reglas: Object.entries(allRules).map(([tipoContrato, r]) => ({
          tipoContrato,
          baseCalculo: r.baseCalculo,
          valor: num(r.valor),
          porcentajeAgente: num(r.porcentajeAgente),
          porcentajeOficina: num(r.porcentajeOficina),
          porcentajeCentral: num(r.porcentajeCentral),
        })),
      }
      const created = await crearAcuerdo(body)
      navigate(created?.id ? `/panel/acuerdos/${created.id}` : '/panel/acuerdos', { replace: true, state: { created: true } })
    } catch (err) {
      setPending(false)
      setServerError(comisionErrorInfo(err))
      if (err?.codigo === 'ACUERDO_SOLAPADO') reload()
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <BackLink />
      <PageHeader
        title="Crear acuerdo comercial"
        description="Define cuánto se cobra por cada tipo de contrato y cómo se reparte. Los acuerdos no se editan después de creados: para cambiar porcentajes se cierra el actual y se crea uno nuevo."
      />

      <form onSubmit={submit} noValidate className="space-y-10">
        <section aria-labelledby="datos-acuerdo" className="space-y-6">
          <h2 id="datos-acuerdo" className="text-section leading-tight text-evergreen">
            Nombre y vigencia
          </h2>
          <Field
            id="acuerdo-nombre"
            label="Nombre"
            error={errors.nombre}
            hint={<p className="text-right text-meta tabular-nums text-muted-foreground">{nombre.length}/{NOMBRE_MAX}</p>}
          >
            {(p) => (
              <Input
                {...p}
                autoFocus
                maxLength={NOMBRE_MAX}
                placeholder="Acuerdo 2027"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  clearError('nombre')
                }}
                disabled={pending}
              />
            )}
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="acuerdo-desde" label="Vigente desde" error={errors.desde}>
              {(p) => (
                <DateField
                  {...p}
                  value={desde}
                  onChange={(v) => {
                    setDesde(v)
                    clearError('desde')
                    clearError('hasta')
                  }}
                  disabled={pending}
                />
              )}
            </Field>
            <Field
              id="acuerdo-hasta"
              label="Vigente hasta"
              error={errors.hasta}
              hint={<p className="text-meta text-muted-foreground">Opcional. Sin fecha de fin, sigue vigente hasta que se cierre.</p>}
            >
              {(p) => (
                <DateField
                  {...p}
                  value={hasta}
                  placeholder="Sin fecha de fin"
                  onChange={(v) => {
                    setHasta(v)
                    clearError('hasta')
                  }}
                  onClear={hasta ? () => setHasta('') : undefined}
                  disabled={pending || (desde ? { before: parseIsoDate(desde) } : undefined)}
                />
              )}
            </Field>
          </div>

          {cruces.map((a) => {
            const closable = a.vigenteDesde < desde
            const dayBefore = toIsoDate(subDays(parseIsoDate(desde), 1))
            return (
              <Alert key={a.id} variant="warning">
                <p>
                  La vigencia se cruza con «{a.nombre}» ({formatFechaCorta(a.vigenteDesde)} – {a.vigenteHasta ? formatFechaCorta(a.vigenteHasta) : 'sin fecha de fin'}).
                  {closable ? ` Ciérralo el ${formatFechaCorta(dayBefore)} para que el nuevo empiece sin cruces.` : ' Elige fechas que no se crucen con ese acuerdo.'}
                </p>
                {closable && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setCloseTarget({ acuerdo: a, hasta: dayBefore })}>
                    Cerrar «{a.nombre}» el {formatFechaCorta(dayBefore)}
                  </Button>
                )}
              </Alert>
            )
          })}
        </section>

        <section aria-labelledby="reglas-acuerdo" className="space-y-6">
          <div className="space-y-1">
            <h2 id="reglas-acuerdo" className="text-section leading-tight text-evergreen">
              Reglas por tipo de contrato
            </h2>
            <p className="max-w-[75ch] text-small text-muted-foreground">
              Compraventa y alquiler son obligatorias. En cada regla el reparto entre agente, oficina y central debe sumar exactamente 100 %.
            </p>
          </div>

          {TIPOS_REGLA_OBLIGATORIOS.map((tipo) => (
            <RuleEditor key={tipo} tipo={tipo} value={reglas[tipo]} onChange={(patch) => setRule(tipo, patch)} error={errors[tipo]} disabled={pending} />
          ))}

          {arras ? (
            <RuleEditor tipo="ARRAS" value={arras} onChange={(patch) => setRule('ARRAS', patch)} error={errors.ARRAS} disabled={pending} onRemove={() => {
                setArras(null)
                clearError('ARRAS')
              }} />
          ) : (
            <button
              type="button"
              onClick={() => setArras(emptyRule('ARRAS'))}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-card border border-dashed border-ash-grey px-6 py-5 text-left text-small text-muted-foreground transition-colors duration-150 hover:border-emerald-depths/60 hover:text-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4 text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
              <span>
                <span className="block font-medium text-evergreen">Agregar regla de arras</span>
                Opcional. Sin ella, los contratos de arras no generan comisión.
              </span>
            </button>
          )}
        </section>

        {serverError && (
          <Alert variant="error">
            <p>{serverError.text}</p>
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-ash-grey/50 pt-6 sm:flex-row sm:items-center sm:justify-end">
          {!sumsOk && <p className="text-small text-muted-foreground sm:mr-auto">Ajusta los repartos para que cada uno sume 100 %.</p>}
          <Button type="button" variant="outline" asChild>
            <Link to="/panel/acuerdos">Cancelar</Link>
          </Button>
          <Button type="submit" loading={pending} disabled={!sumsOk}>
            Guardar acuerdo
          </Button>
        </div>
      </form>

      <CloseAgreementDialog
        open={!!closeTarget}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        acuerdo={closeTarget?.acuerdo ?? { nombre: '' }}
        defaultHasta={closeTarget?.hasta}
        onClosed={() => {
          reload()
          setServerError(null)
        }}
      />
    </div>
  )
}

/** Editor de una regla: base de cálculo, valor y reparto con suma en vivo. */
function RuleEditor({ tipo, value: r, onChange, error, disabled, onRemove }) {
  const meses = r.baseCalculo === 'MESES_CANON'
  const sum = sumOf(r)
  const ok = sumIs100(r)
  const touched = PORCENTAJES.some(([k]) => r[k] !== '')
  const base = `regla-${tipo.toLowerCase()}`

  return (
    <fieldset className={cn('relative space-y-6 rounded-card border p-6', error ? 'border-error/50' : 'border-ash-grey/60')} aria-describedby={error ? `${base}-error` : undefined}>
      <legend className="float-left w-full pr-24 font-display text-subtitle font-semibold text-evergreen">{TIPO_CONTRATO_LABELS[tipo] ?? tipo}</legend>
      {onRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled} className="absolute right-4 top-5 text-muted-foreground">
          <X strokeWidth={1.75} aria-hidden="true" />
          Quitar
        </Button>
      )}

      <div className="clear-both grid gap-6 pt-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${base}-base`}>Cómo se calcula</Label>
          {tipo === 'ALQUILER' ? (
            <Select id={`${base}-base`} value={r.baseCalculo} onChange={(e) => onChange({ baseCalculo: e.target.value })} disabled={disabled}>
              <option value="MESES_CANON">{BASE_CALCULO_LABELS.MESES_CANON}</option>
              <option value="PORCENTAJE_PRECIO">Porcentaje del canon</option>
            </Select>
          ) : (
            <p id={`${base}-base`} className="flex h-11 items-center rounded-control border border-ash-grey/50 bg-pale-oak/10 px-3 text-body text-evergreen">
              {BASE_CALCULO_LABELS.PORCENTAJE_PRECIO}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${base}-valor`}>{meses ? 'Meses de canon' : 'Porcentaje del precio'}</Label>
          <div className="relative">
            <Input
              id={`${base}-valor`}
              inputMode="decimal"
              autoComplete="off"
              placeholder={meses ? '1' : '3'}
              value={r.valor}
              onChange={(e) => onChange({ valor: decimalInput(e.target.value, 4) })}
              disabled={disabled}
              className="pr-16 font-medium tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-small text-muted-foreground">{meses ? 'meses' : '%'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-ash-grey/40 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-small font-medium text-evergreen">Reparto</p>
          <p
            className={cn('flex items-center gap-1.5 text-small tabular-nums', ok ? 'text-success' : touched ? 'text-error' : 'text-muted-foreground')}
            aria-live="polite"
          >
            {ok ? <CircleCheck className="size-4" strokeWidth={1.75} aria-hidden="true" /> : touched && <CircleAlert className="size-4" strokeWidth={1.75} aria-hidden="true" />}
            Suma {formatNumero(Math.round(sum * 100) / 100)} %
            {!ok && touched && ` · ${sum < 100 ? 'faltan' : 'sobran'} ${formatNumero(Math.round(Math.abs(100 - sum) * 100) / 100)}`}
          </p>
        </div>
        <SplitBar parts={PORCENTAJES.map(([k, t]) => ({ tipo: t, porcentaje: num(r[k]) || 0 }))} />
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {PORCENTAJES.map(([k, t]) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={`${base}-${k}`}>{BENEFICIARIO_LABELS[t]}</Label>
              <div className="relative">
                <Input
                  id={`${base}-${k}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={r[k]}
                  onChange={(e) => onChange({ [k]: decimalInput(e.target.value) })}
                  disabled={disabled}
                  className="pr-8 font-medium tabular-nums"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-small text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {meses && (
        <p className="flex items-start gap-2 text-meta text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
          La comisión total será el canon mensual multiplicado por los meses indicados.
        </p>
      )}
      {error && (
        <p id={`${base}-error`} className="animate-alert-in text-small text-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function BackLink() {
  return (
    <Link to="/panel/acuerdos" className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors duration-150 hover:text-evergreen">
      <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Acuerdos comerciales
    </Link>
  )
}
