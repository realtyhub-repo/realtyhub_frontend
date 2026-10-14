import { Badge } from '@/components/ui/badge'
import { ESTADO_BADGE, ESTADO_LABELS } from '@/lib/property'

/** Estado comercial como badge: color + punto, en modo oración ("Reservada", no "RESERVADO"). */
export function StatusBadge({ estado, className }) {
  return (
    <Badge variant={ESTADO_BADGE[estado] ?? 'outline'} dot className={className}>
      {ESTADO_LABELS[estado] ?? estado}
    </Badge>
  )
}
