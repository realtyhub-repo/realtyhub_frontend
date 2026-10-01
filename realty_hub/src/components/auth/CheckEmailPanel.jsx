import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { resendVerification } from '@/api/authApi'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/** Aviso "revisa tu correo" con opción de reenviar la verificación (respuesta siempre neutral). */
export function CheckEmailPanel({ email }) {
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [mensaje, setMensaje] = useState(null)

  async function handleResend() {
    setState('sending')
    try {
      await resendVerification(email)
      setState('sent')
    } catch (err) {
      setMensaje(err.mensaje)
      setState('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-card border border-ash-grey/70 bg-pale-oak/15 p-5">
        <MailCheck className="mt-0.5 size-6 shrink-0 text-evergreen" strokeWidth={1.5} aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-small text-muted-foreground">Enviamos el enlace de activación a</p>
          <p className="break-all font-medium text-evergreen">{email}</p>
        </div>
      </div>

      {state === 'sent' && (
        <Alert variant="success">
          <p>Si la cuenta existe y no está verificada, te enviamos un nuevo correo de activación.</p>
        </Alert>
      )}
      {state === 'error' && (
        <Alert variant="error">
          <p>{mensaje}</p>
        </Alert>
      )}

      <div className="space-y-2">
        <p className="text-small text-muted-foreground">¿No te llegó? Revisa la carpeta de spam o solicita otro.</p>
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          loading={state === 'sending'}
          disabled={state === 'sent'}
        >
          Reenviar correo de activación
        </Button>
      </div>
    </div>
  )
}
