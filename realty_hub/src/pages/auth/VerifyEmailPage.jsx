import { CircleCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { resendVerification, verifyEmail } from '@/api/authApi'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Field } from '@/components/auth/Field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateEmail } from '@/lib/validation'

/**
 * Ruta EXACTA /verify-email?token=... (el backend construye el enlace del correo).
 * El token es de un solo uso: useRef evita la segunda llamada del doble efecto de StrictMode.
 */
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState(token ? 'verifying' : 'error') // verifying | success | error
  const [mensaje, setMensaje] = useState(token ? null : 'El enlace de verificación no es válido.')
  const done = useRef(false)

  useEffect(() => {
    if (!token || done.current) return
    done.current = true
    verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        setMensaje(err.mensaje)
        setState('error')
      })
  }, [token])

  if (state === 'verifying') {
    return (
      <AuthLayout title="Verificando tu cuenta" description="Esto solo toma un momento.">
        <div className="flex items-center gap-3 text-muted-foreground" role="status">
          <LoaderCircle className="size-5 animate-spin text-emerald-depths" strokeWidth={1.75} aria-hidden="true" />
          Validando el enlace de activación
        </div>
      </AuthLayout>
    )
  }

  if (state === 'success') {
    return (
      <AuthLayout title="Cuenta verificada" description="Tu correo quedó confirmado. Ya puedes iniciar sesión.">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-success">
            <CircleCheck className="size-6" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-medium">Cuenta activada</span>
          </div>
          <Button asChild className="w-full">
            <Link to="/login" replace>
              Iniciar sesión
            </Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="No pudimos verificar tu cuenta"
      description="El enlace puede haber expirado o ya fue utilizado. Solicita uno nuevo con tu correo."
    >
      <Alert variant="error" className="mb-6">
        <p>{mensaje}</p>
      </Alert>
      <ResendVerificationForm />
    </AuthLayout>
  )
}

function ResendVerificationForm() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validateEmail(email)
    setFieldError(err)
    if (err) return
    setError(null)
    setState('sending')
    try {
      await resendVerification(email.trim())
      setState('sent')
    } catch (apiErr) {
      setError(apiErr.mensaje)
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          <p>Si la cuenta existe y no está verificada, te enviamos un nuevo correo de activación.</p>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}
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
            disabled={state === 'sending'}
          />
        )}
      </Field>
      <Button type="submit" className="w-full" loading={state === 'sending'}>
        Reenviar correo de activación
      </Button>
      <p className="text-center text-small">
        <Link to="/login" className="text-emerald-depths underline-offset-4 hover:text-evergreen hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  )
}
