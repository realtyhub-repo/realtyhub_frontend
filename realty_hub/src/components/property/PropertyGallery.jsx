import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PropertyPhoto } from '@/components/property/PropertyPhoto'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/*
 * Ubicación de cada foto en el mosaico (escritorio): la primera manda y las demás la acompañan.
 * La grilla es de 4 columnas × 2 filas; según cuántas fotos haya se reparten distinto para no dejar huecos.
 */
const LAYOUTS = {
  2: ['col-span-2 row-span-2', 'col-span-2 row-span-2'],
  3: ['col-span-2 row-span-2', 'col-span-2', 'col-span-2'],
  4: ['col-span-2 row-span-2', 'col-span-2', 'col-span-1', 'col-span-1'],
  5: ['col-span-2 row-span-2', '', '', '', ''],
}

/**
 * Galería del detalle de propiedad (docs §4.1: `imagenes` ya viene ordenada).
 * Mosaico de hasta cinco fotos + visor a pantalla completa con teclado (← →) y tira de miniaturas.
 * El visor es el único momento con animación propia del catálogo (CLAUDE.md §7).
 */
export function PropertyGallery({ imagenes = [], titulo }) {
  const [viewer, setViewer] = useState(null) // índice abierto o null
  const n = imagenes.length

  if (n === 0) {
    return <PropertyPhoto alt={`${titulo}: sin fotos`} label="Esta propiedad aún no tiene fotos" className="aspect-[16/9] max-h-[60svh] w-full rounded-card" />
  }

  const shown = imagenes.slice(0, 5)
  const layout = LAYOUTS[Math.min(n, 5)]

  return (
    <>
      {n === 1 ? (
        <Tile image={imagenes[0]} alt={titulo} onOpen={() => setViewer(0)} className="aspect-[16/9] max-h-[68svh] w-full rounded-card" eager />
      ) : (
        <div className="relative">
          {/* Móvil: solo la principal, en 4:3 */}
          <Tile image={imagenes[0]} alt={titulo} onOpen={() => setViewer(0)} className="aspect-[4/3] w-full rounded-card md:hidden" eager />
          <div className="hidden h-[clamp(360px,58svh,600px)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-card md:grid">
            {shown.map((img, i) => (
              <Tile
                key={img.id}
                image={img}
                alt={i === 0 ? titulo : `${titulo}, foto ${i + 1}`}
                onOpen={() => setViewer(i)}
                className={cn('size-full', layout[i])}
                eager={i === 0}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setViewer(0)}
            className="absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-control border border-evergreen/15 bg-floral-white/95 px-4 text-small font-medium text-evergreen shadow-[0_1px_2px_rgb(10_59_53/0.12)] transition-colors duration-150 hover:bg-floral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Images className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Ver las {n} fotos
          </button>
        </div>
      )}

      <Lightbox imagenes={imagenes} titulo={titulo} index={viewer} onIndexChange={setViewer} />
    </>
  )
}

function Tile({ image, alt, onOpen, className, eager }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pale-oak', className)}
      aria-label={`Ampliar: ${alt}`}
    >
      <PropertyPhoto
        src={image.url}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        className="size-full"
        imgClassName="transition-[scale,filter] duration-200 ease-out group-hover:scale-[1.02] group-hover:brightness-[0.94]"
      />
    </button>
  )
}

/** Visor a pantalla completa. `index` null = cerrado. */
function Lightbox({ imagenes, titulo, index, onIndexChange }) {
  const open = index !== null
  const n = imagenes.length
  const go = (delta) => onIndexChange((i) => (i + delta + n) % n)
  const stripRef = useRef(null)

  // Mantener visible la miniatura activa en la tira.
  useEffect(() => {
    if (!open) return
    stripRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [open, index])

  const current = open ? imagenes[index] : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onIndexChange(null)}>
      <DialogContent
        side="full"
        hideClose
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          if (e.key === 'ArrowLeft') go(-1)
        }}
      >
        <DialogTitle className="sr-only">Fotos de {titulo}</DialogTitle>
        <DialogDescription className="sr-only">Usa las flechas del teclado para cambiar de foto.</DialogDescription>

        <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-8">
          <p className="min-w-0 truncate text-small text-floral-white/80">{titulo}</p>
          <div className="flex items-center gap-4">
            <p className="text-small tabular-nums text-floral-white/70" aria-live="polite">
              {index + 1} / {n}
            </p>
            <DialogClose
              className="flex size-10 items-center justify-center rounded-control text-floral-white/80 transition-colors duration-150 hover:bg-floral-white/10 hover:text-floral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pale-oak"
              aria-label="Cerrar"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </DialogClose>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
          {current && (
            <img
              key={current.id}
              src={current.url}
              alt={`${titulo}, foto ${index + 1} de ${n}`}
              className="max-h-full max-w-full animate-fade rounded-control object-contain"
            />
          )}
          {n > 1 && (
            <>
              <NavButton side="left" onClick={() => go(-1)} />
              <NavButton side="right" onClick={() => go(1)} />
            </>
          )}
        </div>

        {n > 1 && (
          <div ref={stripRef} className="flex shrink-0 gap-2 overflow-x-auto px-4 py-4 sm:justify-center sm:px-8" aria-label="Miniaturas">
            {imagenes.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-current={i === index}
                aria-label={`Foto ${i + 1}`}
                className={cn(
                  'h-14 w-20 shrink-0 overflow-hidden rounded-control transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pale-oak',
                  i === index ? 'opacity-100 ring-2 ring-pale-oak' : 'opacity-50 hover:opacity-90',
                )}
              >
                <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NavButton({ side, onClick }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Foto anterior' : 'Foto siguiente'}
      className={cn(
        'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-floral-white/10 text-floral-white transition-colors duration-150 hover:bg-floral-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pale-oak',
        side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6',
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
