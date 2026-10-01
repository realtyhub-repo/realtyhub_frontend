import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Alzados en trazo fino (line art, 1.5px) para el panel de marca del login.
 * Funciona como un juego de láminas de plano: cada tipología (edificio, casa, villa, cabaña)
 * se "dibuja" trazo a trazo, se mantiene unos segundos con las ventanas encendiéndose y
 * después se borra mientras la siguiente se dibuja sobre la misma línea de suelo.
 * Con prefers-reduced-motion solo se muestra la primera lámina, sin ciclo.
 * Decorativo: aria-hidden. El color se hereda con currentColor.
 */

const CYCLE_MS = 7000 // tiempo que cada lámina permanece en pantalla
const ERASE_MS = 900 // duración del borrado (coincide con .scene-erase en index.css)
const ENTER_OFFSET = 0.45 // s: la lámina nueva empieza a dibujarse cuando la anterior ya se está borrando

// Pseudoaleatorio determinista: mismo patrón en cada render, sin parpadeos entre renders.
const rand = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/** Desfase global de la lámina: la primera entra sin espera, las siguientes tras el borrado. */
const DelayOffset = createContext(0)

/** Trazo que se dibuja con un retraso (s). pathLength=1 normaliza el dasharray. */
function Stroke({ as: Tag = 'path', delay = 0, style, ...props }) {
  const offset = useContext(DelayOffset)
  return <Tag pathLength="1" className="draw-stroke" style={{ animationDelay: `${offset + delay}s`, ...style }} {...props} />
}

/** Relleno tenue que se enciende y apaga, como una luz interior. Acepta rect, polygon, circle… */
function Glow({ as: Tag = 'rect', seed, ...props }) {
  return (
    <Tag
      stroke="none"
      className="window-light"
      style={{
        '--delay': `${1.8 + rand(seed) * 4}s`,
        '--dur': `${5 + rand(seed + 1) * 5}s`,
        '--glow': (0.18 + rand(seed + 2) * 0.3).toFixed(2),
      }}
      {...props}
    />
  )
}

function Window({ x, y, w, h, seed, mullion = false, sill = false, delay }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Glow x="1.5" y="1.5" width={w - 3} height={h - 3} seed={seed} />
      <Stroke as="rect" width={w} height={h} rx="1" delay={delay} />
      {mullion && <Stroke as="line" x1={w / 2} y1="0" x2={w / 2} y2={h} opacity="0.5" delay={delay + 0.2} />}
      {sill && <Stroke as="line" x1="-4" y1={h + 4} x2={w + 4} y2={h + 4} delay={delay + 0.2} />}
    </g>
  )
}

/** Cotas de plano: ancho bajo el suelo y alto a la derecha, ajustadas a cada lámina. */
function Dimensions({ x1, x2, top }) {
  return (
    <g opacity="0.4">
      <Stroke d={`M${x1} 492H${x2}`} strokeDasharray="2 6" delay={1.3} />
      <Stroke d={`M${x1} 486v12M${x2} 486v12`} delay={1.4} />
      <Stroke d={`M484 ${top}V470`} strokeDasharray="2 6" delay={1.3} />
      <Stroke d={`M478 ${top}h12M478 470h12`} delay={1.4} />
    </g>
  )
}

/* ---------------------------------------------------------------- Láminas */

function Tower() {
  const windows = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      windows.push(
        <Window
          key={`${row}-${col}`}
          x={148 + col * 52}
          y={118 + row * 62}
          w={30}
          h={40}
          seed={row * 4 + col}
          mullion
          sill
          delay={0.5 + (4 - row) * 0.12 + col * 0.05}
        />,
      )
    }
  }
  return (
    <>
      <Stroke d="M128 470V96h232v374" delay={0.15} />
      <Stroke d="M118 96h252" delay={0.5} />
      <Stroke d="M140 96V78h208v18" opacity="0.7" delay={0.6} />
      {windows}

      {/* Planta baja y acceso */}
      <Stroke d="M128 432h232" opacity="0.6" delay={0.4} />
      <Stroke d="M222 470v-64a22 22 0 0 1 44 0v64" delay={0.45} />
      <Stroke as="line" x1="244" y1="384" x2="244" y2="470" opacity="0.4" delay={0.55} />

      {/* Edificio bajo lateral */}
      <g opacity="0.55">
        <Stroke d="M360 470V250h96v220" delay={0.3} />
        <Stroke d="M352 250h112" delay={0.6} />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <Window x={378} y={278 + r * 58} w={24} h={32} seed={40 + r * 2} delay={0.8 + r * 0.1} />
            <Window x={414} y={278 + r * 58} w={24} h={32} seed={41 + r * 2} delay={0.85 + r * 0.1} />
          </g>
        ))}
      </g>

      {/* Casa a la izquierda */}
      <g opacity="0.55">
        <Stroke d="M40 470V330l44-36 44 36" delay={0.3} />
        <Stroke d="M62 470v-50h30v50" delay={0.6} />
        <Window x={56} y={346} w={24} h={24} seed={60} delay={0.7} />
      </g>

      <Dimensions x1={128} x2={360} top={96} />
    </>
  )
}

function FamilyHouse() {
  return (
    <>
      {/* Muros y cubierta a dos aguas */}
      <Stroke d="M150 470V312h220v158" delay={0.15} />
      <Stroke d="M130 318L260 204l130 114" delay={0.4} />
      <Stroke d="M150 300L260 204l110 96" opacity="0.4" delay={0.55} />
      <Stroke d="M318 255V214h24v62" delay={0.7} />
      <Stroke d="M314 214h32" delay={0.8} />

      {/* Ojo de buey en el hastial */}
      <Glow as="circle" cx="260" cy="262" r="13" seed={70} />
      <Stroke as="circle" cx="260" cy="262" r="14" delay={0.75} />
      <Stroke d="M246 262h28M260 248v28" opacity="0.45" delay={0.9} />

      {/* Puerta con alero y escalón */}
      <Stroke d="M240 470v-74h40v74" delay={0.5} />
      <Stroke d="M232 396l28-14 28 14" opacity="0.7" delay={0.7} />
      <Stroke d="M228 470v-6h64v6" opacity="0.6" delay={0.85} />
      <Stroke as="circle" cx="271" cy="436" r="1.5" delay={0.95} />

      <Window x={170} y={342} w={46} h={50} seed={71} mullion sill delay={0.6} />
      <Window x={304} y={342} w={46} h={50} seed={72} mullion sill delay={0.65} />

      {/* Valla y árbol */}
      <g opacity="0.55">
        <Stroke d="M40 470v-38M64 470v-38M88 470v-38M112 470v-38M136 470v-38" delay={0.6} />
        <Stroke d="M32 446h112M32 460h112" delay={0.8} />
        <Stroke d="M432 470v-62" delay={0.4} />
        <Stroke as="circle" cx="432" cy="378" r="34" delay={0.6} />
        <Stroke d="M432 430l-14-16M432 418l12-12" opacity="0.6" delay={0.9} />
      </g>

      <Dimensions x1={150} x2={370} top={204} />
    </>
  )
}

function ModernVilla() {
  return (
    <>
      {/* Volumen inferior y volumen superior en voladizo */}
      <Stroke d="M90 470V368h290" delay={0.15} />
      <Stroke d="M80 368h220" opacity="0.6" delay={0.35} />
      <Stroke d="M200 368V286h244v84" delay={0.3} />
      <Stroke d="M190 286h264" delay={0.55} />
      <Stroke d="M436 370V470" opacity="0.7" delay={0.6} />

      {/* Ventanal corrido en planta alta */}
      <g transform="translate(220 304)">
        <Glow x="1.5" y="1.5" width="201" height="41" seed={80} />
        <Stroke as="rect" width="204" height="44" rx="1" delay={0.6} />
        <Stroke d="M51 0v44M102 0v44M153 0v44" opacity="0.5" delay={0.8} />
      </g>

      {/* Planta baja: cristaleras de suelo a techo y acceso */}
      <Window x={106} y={386} w={64} h={84} seed={81} mullion delay={0.5} />
      <Window x={182} y={386} w={64} h={84} seed={82} mullion delay={0.55} />
      <Stroke d="M290 470v-78h36v78" delay={0.6} />
      <Stroke d="M318 428v12" delay={0.8} />

      {/* Lámina de agua y lamas de pérgola */}
      <g opacity="0.55">
        <Stroke d="M90 486h150" strokeDasharray="10 8" delay={1} />
        <Stroke d="M44 470v-90M44 380h46M52 380v8M62 380v8M72 380v8M82 380v8" delay={0.7} />
      </g>

      <Dimensions x1={90} x2={444} top={286} />
    </>
  )
}

function Cabin() {
  return (
    <>
      {/* Estructura en A con alero */}
      <Stroke d="M136 470L260 176l124 294" delay={0.15} />
      <Stroke d="M164 470L260 242l96 228" opacity="0.5" delay={0.4} />
      <Stroke d="M252 176l8-22 8 22" opacity="0.7" delay={0.7} />

      {/* Gran cristalera triangular */}
      <Glow as="polygon" points="192,468 260,298 328,468" seed={90} />
      <Stroke d="M190 470L260 296l70 174" delay={0.5} />
      <Stroke d="M214 410h92M260 296v114" opacity="0.5" delay={0.75} />
      <Stroke d="M242 470v-46h36v46" delay={0.85} />

      {/* Ventana del altillo */}
      <Glow as="circle" cx="260" cy="252" r="9" seed={91} />
      <Stroke as="circle" cx="260" cy="252" r="10" delay={0.8} />

      {/* Terraza */}
      <Stroke d="M112 470v-10h296v10" opacity="0.6" delay={0.9} />

      {/* Pinos */}
      <g opacity="0.55">
        <Stroke d="M64 470v-24M36 446L64 360l28 86z" delay={0.4} />
        <Stroke d="M44 418h40" opacity="0.6" delay={0.8} />
        <Stroke d="M446 470v-20M424 450L446 384l22 66z" delay={0.5} />
        <Stroke d="M98 470v-14M82 456L98 410l16 46z" delay={0.6} />
      </g>

      <Dimensions x1={136} x2={384} top={176} />
    </>
  )
}

const SCENES = [
  { Drawing: Tower },
  { Drawing: FamilyHouse },
  { Drawing: ModernVilla },
  { Drawing: Cabin },
]

function useSceneCycle() {
  const [step, setStep] = useState(0)
  const [erased, setErased] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setStep((s) => s + 1), CYCLE_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (step === 0) return
    const id = setTimeout(() => setErased(step), ERASE_MS)
    return () => clearTimeout(id)
  }, [step])

  // `erased < step` mientras la lámina anterior todavía se está borrando
  return { step, leaving: erased < step ? step - 1 : null }
}

export function FacadeIllustration({ className }) {
  const { step, leaving } = useSceneCycle()
  const scene = SCENES[step % SCENES.length]

  // Clave por paso: la lámina entrante se monta de cero y reinicia su animación de trazo;
  // la saliente se renderiza aparte con .scene-erase, que invierte el trazo.
  const layers = []
  if (leaving !== null) {
    const { Drawing } = SCENES[leaving % SCENES.length]
    layers.push(
      <g key={leaving} className="scene-erase">
        <Drawing />
      </g>,
    )
  }
  layers.push(
    <DelayOffset.Provider key={step} value={step === 0 ? 0 : ENTER_OFFSET}>
      <g>
        <scene.Drawing />
      </g>
    </DelayOffset.Provider>,
  )

  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Línea de suelo común: todas las láminas "crecen" desde ahí */}
      <Stroke d="M16 470h488" />
      {layers}
    </svg>
  )
}
