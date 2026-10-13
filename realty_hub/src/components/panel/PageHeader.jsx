/** Encabezado de página del panel: título a la izquierda, acciones a la derecha. */
export function PageHeader({ title, description, actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-ash-grey/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-page leading-tight text-evergreen">{title}</h1>
        {description && <p className="max-w-[65ch] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
