import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { isValidPassword, resetPassword } from '@/api/authApi'
import { AuthLayout, TextLink } from '@/components/auth/AuthLayout'
import { Field } from '@/components/auth/Field'
import { PasswordChecklist } from '@/components/auth/PasswordChecklist'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { compactErrors } from '@/lib/validation'

/** Ruta EXACTA /reset-password?token=... (el backend construye el enlace del correo). */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((errs) => (errs ? { ...errs, [key]: null } : errs))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = compactErrors({
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
      await resetPassword({ token, ...form })
      navigate('/login', {
        replace: true,
        state: { notice: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' },
      })
    } catch (err) {
      setError(err.mensaje)
      setPending(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Enlace no válido"
        description="Este enlace para restablecer la contraseña está incompleto. Solicita uno nuevo."
      >
        <Button asChild className="w-full">
          <Link to="/olvide-contrasena">Solicitar un nuevo enlace</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Crea una nueva contraseña"
      description="Elige una contraseña que no hayas usado antes en RealtyHub."
      footer={
        <>
          ¿Recordaste tu contraseña? <TextLink to="/login">Inicia sesión</TextLink>
        </>
      }
    >
      {error && (
        <Alert variant="error" className="mb-6">
          <p>{error}</p>
          <p>
            Si el enlace expiró, <TextLink to="/olvide-contrasena">solicita uno nuevo</TextLink>.
          </p>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          id="password"
          label="Nueva contraseña"
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
          Actualizar contraseña
        </Button>
      </form>
    </AuthLayout>
  )
}
