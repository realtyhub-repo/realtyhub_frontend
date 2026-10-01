import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { forgotPassword } from '@/api/authApi'
import { AuthLayout, TextLink } from '@/components/auth/AuthLayout'
import { Field } from '@/components/auth/Field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateEmail } from '@/lib/validation'

/** POST /auth/forgot-password: siempre 200, así que la confirmación es neutral (docs §5.6). */
export default function ForgotPasswordPage() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validateEmail(email)
    setFieldError(err)
    if (err) return
    setError(null)
    setPending(true)
    try {
      await forgotPassword(email.trim())
      setSentTo(email.trim())
    } catch (apiErr) {
      setError(apiErr.mensaje)
    } finally {
      setPending(false)
    }
  }

  const footer = (
    <>
      ¿Recordaste tu contraseña? <TextLink to="/login">Inicia sesión</TextLink>
    </>
  )

  if (sentTo) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        description="Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. El enlace vence en unos minutos."
        footer={footer}
      >
        <div className="flex items-start gap-4 rounded-card border border-ash-grey/70 bg-pale-oak/15 p-5">
          <MailCheck className="mt-0.5 size-6 shrink-0 text-evergreen" strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-small text-muted-foreground">Solicitud enviada para</p>
            <p className="break-all font-medium text-evergreen">{sentTo}</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="mt-6" onClick={() => setSentTo(null)}>
          Usar otro correo
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Restablece tu contraseña"
      description="Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña."
      footer={footer}
    >
      {error && (
        <Alert variant="error" className="mb-6">
          <p>{error}</p>
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field id="email" label="Correo electrónico" error={fieldError}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldError(null)
              }}
              disabled={pending}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" loading={pending}>
          Enviar enlace
        </Button>
      </form>
    </AuthLayout>
  )
}
