import { Mail, MessageCircle, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { telHref, whatsappUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Contacto del cliente de un lead (`LeadDetalleResponse`): llamar (`tel:`), WhatsApp y correo (`mailto:`).
 * Si el teléfono viene vacío se dice explícitamente en vez de dejar el hueco (docs/leads-service.md §3).
 * `compact`: versión apilada para paneles estrechos (detalle de visita en la agenda).
 */
export function ClientContact({ lead, compact = false, className }) {
  const telefono = lead?.telefonoCliente?.trim()
  const wa = whatsappUrl(telefono)

  return (
    <div className={cn('rounded-card border border-ash-grey/60', className)}>
      <div className={cn('flex items-center gap-4', compact ? 'p-4' : 'p-5')}>
        <Avatar name={lead?.nombreCliente ?? ''} className="size-12 text-body" />
        <div className="min-w-0">
          <p className="truncate font-display text-subtitle font-semibold leading-tight text-evergreen">{lead?.nombreCliente || 'Cliente'}</p>
          <p className="text-small text-muted-foreground">Cliente</p>
        </div>
      </div>

      <dl className={cn('grid border-t border-ash-grey/50', !compact && 'sm:grid-cols-2')}>
        <div className={cn('space-y-2', compact ? 'p-4' : 'p-5', !compact && 'sm:border-r sm:border-ash-grey/50')}>
          <dt className="text-meta text-muted-foreground">Teléfono</dt>
          {telefono ? (
            <dd className="space-y-3">
              <p className="font-medium text-evergreen tabular-nums">{telefono}</p>
              <div className="flex flex-wrap gap-2">
                <a href={telHref(telefono)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  <Phone strokeWidth={1.75} aria-hidden="true" />
                  Llamar
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <MessageCircle strokeWidth={1.75} aria-hidden="true" />
                    WhatsApp
                  </a>
                )}
              </div>
            </dd>
          ) : (
            <dd className="text-small text-muted-foreground">Sin teléfono registrado</dd>
          )}
        </div>
        <div className={cn('space-y-2 border-t border-ash-grey/50', compact ? 'p-4' : 'p-5', !compact && 'sm:border-t-0')}>
          <dt className="text-meta text-muted-foreground">Correo</dt>
          {lead?.emailCliente ? (
            <dd>
              <a
                href={`mailto:${lead.emailCliente}`}
                className="inline-flex max-w-full items-center gap-2 font-medium text-evergreen underline-offset-4 hover:underline"
              >
                <Mail className="size-4 shrink-0 text-ash-grey" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{lead.emailCliente}</span>
              </a>
            </dd>
          ) : (
            <dd className="text-small text-muted-foreground">Sin correo registrado</dd>
          )}
        </div>
      </dl>
    </div>
  )
}
