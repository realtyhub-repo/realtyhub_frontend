import { useState } from 'react'
import { isValidPassword, register } from '@/api/authApi'
import { AuthLayout, TextLink } from '@/components/auth/AuthLayout'
import { CheckEmailPanel } from '@/components/auth/CheckEmailPanel'
import { Field } from '@/components/auth/Field'
import { PasswordChecklist } from '@/components/auth/PasswordChecklist'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { compactErrors, validateEmail } from '@/lib/validation'

const EMPTY = { nombre: '', email: '', password: '', confirmPassword: '' }

/** POST /auth/register → 201 sin sesión: hay que verificar el correo (docs §5.1). */
export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState(null)
  const [error, setError] = useState(null) // { status, mensaje }
  const [pending, setPending] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState(null)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = compactErrors({
      nombre: form.nombre.trim() ? null : 'Ingresa tu nombre',
      email: validateEmail(form.email),
      password: isValidPassword(form.password) ? null : 'La contraseña no cumple los requisitos',
      confirmPassword: !form.confirmPassword
        ? 'Confirma tu contraseña'
        : form.confirmPassword !== form.password
          ? 'Las contraseñas no coinciden'
          : null,
    })
    setFieldErrors(errs)
    if (errs) return

    setError(null)
    setPending(true)
    try {
      const email = form.email.trim()
      await register({ ...form, email, nombre: form.nombre.trim() })
      setRegisteredEmail(email)
    } catch (err) {
      setError({ status: err.status, mensaje: err.mensaje })
    } finally {
      setPending(false)
    }
  }

  if (registeredEmail) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        description="Te enviamos un enlace para activar tu cuenta. Ábrelo desde este dispositivo o desde cualquier otro."
        footer={
          <>
            ¿Ya activaste tu cuenta? <TextLink to="/login" state={{ email: registeredEmail }}>Inicia sesión</TextLink>
          </>
        }
      >
        <CheckEmailPanel email={registeredEmail} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      description="Regístrate con tu correo. Te enviaremos un enlace para activar la cuenta."
      footer={
        <>
          ¿Ya tienes cuenta? <TextLink to="/login">Inicia sesión</TextLink>
        </>
      }
    >
      {error && (
        <Alert variant="error" className="mb-6">
          <p>{error.mensaje}</p>
          {error.status === 409 && (
            <p className="text-evergreen">
              <TextLink to="/login" state={{ email: form.email.trim() }}>
                Inicia sesión
              </TextLink>{' '}
              o{' '}
              <TextLink to="/olvide-contrasena" state={{ email: form.email.trim() }}>
                recupera tu contraseña
              </TextLink>
              .
            </p>
          )}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field id="nombre" label="Nombre completo" error={fieldErrors?.nombre}>
          {(props) => (
            <Input {...props} autoComplete="name" value={form.nombre} onChange={update('nombre')} disabled={pending} />
          )}
        </Field>

        <Field id="email" label="Correo electrónico" error={fieldErrors?.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correo.com"
              value={form.email}
              onChange={update('email')}
              disabled={pending}
            />
          )}
        </Field>

        <Field
          id="password"
          label="Contraseña"
          error={fieldErrors?.password}
          hint={<PasswordChecklist value={form.password} />}
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              disabled={pending}
            />
          )}
        </Field>

        <Field id="confirmPassword" label="Confirmar contraseña" error={fieldErrors?.confirmPassword}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              disabled={pending}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={pending}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  )
}
