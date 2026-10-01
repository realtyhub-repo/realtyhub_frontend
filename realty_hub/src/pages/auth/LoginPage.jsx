import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { resendVerification } from '@/api/authApi'
import { useAuth } from '@/auth/auth-context'
import { AuthLayout, TextLink } from '@/components/auth/AuthLayout'
import { Field } from '@/components/auth/Field'
import { GoogleSignIn, OrDivider } from '@/components/auth/GoogleSignIn'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { compactErrors, validateEmail } from '@/lib/validation'

/**
 * Login con email/contraseña + Google. La UI se decide por `status`, nunca por el texto de `mensaje`:
 *   401 credenciales incorrectas · 403 email sin verificar · 409 cuenta de Google (docs §4).
 */
export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname ?? '/panel'
  const notice = location.state?.notice

  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' })
  const [fieldErrors, setFieldErrors] = useState(null)
  const [error, setError] = useState(null) // { kind, mensaje }
  const [pending, setPending] = useState(null) // 'password' | 'google' | 'resend'
  const [resent, setResent] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = compactErrors({
      email: validateEmail(form.email),
      password: form.password ? null : 'Ingresa tu contraseña',
    })
    setFieldErrors(errs)
    if (errs) return

    setError(null)
    setResent(false)
    setPending('password')
    try {
      await login({ email: form.email.trim(), password: form.password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const kind = { 401: 'credentials', 403: 'unverified', 409: 'google-account' }[err.status] ?? 'generic'
      setError({ kind, mensaje: err.mensaje })
      setPending(null)
    }
  }

  async function handleGoogle(idToken) {
    setError(null)
    setPending('google')
    try {
      await loginWithGoogle(idToken)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const mensaje =
        err.status === 401 ? 'No pudimos validar tu cuenta de Google. Intenta de nuevo.' : err.mensaje
      setError({ kind: err.status === 409 ? 'password-account' : 'generic', mensaje })
      setPending(null)
    }
  }

  async function handleResend() {
    setPending('resend')
    try {
      await resendVerification(form.email.trim())
      setResent(true)
    } catch (err) {
      setError({ kind: 'generic', mensaje: err.mensaje })
    } finally {
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <AuthLayout
      title="Inicia sesión"
      description="Accede al panel de RealtyHub con tu cuenta."
      footer={
        <>
          ¿Aún no tienes cuenta? <TextLink to="/registro">Crea una cuenta</TextLink>
        </>
      }
    >
      {notice && !error && (
        <Alert variant="success" className="mb-6">
          <p>{notice}</p>
        </Alert>
      )}

      {error && <LoginError error={error} resent={resent} onResend={handleResend} resending={pending === 'resend'} />}

      <GoogleSignIn
        onCredential={handleGoogle}
        onError={() => setError({ kind: 'generic', mensaje: 'No se pudo iniciar sesión con Google. Intenta de nuevo.' })}
        disabled={busy}
      />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
              disabled={busy}
            />
          )}
        </Field>

        <Field
          id="password"
          label="Contraseña"
          error={fieldErrors?.password}
          action={
            <TextLink to="/olvide-contrasena" className="text-small">
              ¿Olvidaste tu contraseña?
            </TextLink>
          }
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              value={form.password}
              onChange={update('password')}
              disabled={busy}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={pending === 'password'} disabled={busy}>
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  )
}

function LoginError({ error, resent, onResend, resending }) {
  if (error.kind === 'unverified') {
    return (
      <Alert variant="warning" className="mb-6">
        <p>{error.mensaje}</p>
        {resent ? (
          <p className="text-success">
            Si la cuenta existe y no está verificada, te enviamos un nuevo correo de activación.
          </p>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onResend} loading={resending}>
            Reenviar correo de activación
          </Button>
        )}
      </Alert>
    )
  }

  if (error.kind === 'google-account') {
    return (
      <Alert variant="info" className="mb-6">
        <p>{error.mensaje}</p>
        <p className="text-muted-foreground">Esta cuenta se creó con Google. Usa el botón Continuar con Google.</p>
      </Alert>
    )
  }

  if (error.kind === 'password-account') {
    return (
      <Alert variant="info" className="mb-6">
        <p>{error.mensaje}</p>
        <p className="text-muted-foreground">Inicia sesión con tu correo y contraseña.</p>
      </Alert>
    )
  }

  return (
    <Alert variant="error" className="mb-6">
      <p>{error.mensaje}</p>
    </Alert>
  )
}
