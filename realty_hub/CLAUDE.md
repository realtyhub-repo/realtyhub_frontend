# RealtyHub — Guía de diseño

> Ubicación en el proyecto: `/docs/design-guide.md`

Referencia de estilo para todo el frontend de RealtyHub (panel de agentes y catálogo público). Este documento define el sistema de diseño que Claude Code debe seguir al construir o modificar cualquier componente. No es un moodboard, son reglas a aplicar.

## 1. Contexto y dirección

RealtyHub es una plataforma inmobiliaria — el producto vende confianza y permanencia (alguien está a punto de comprar o alquilar algo caro), no urgencia de e-commerce. La dirección visual se apoya en esa idea: **tierra, madera, piedra, fachada** — no el azul corporativo genérico de SaaS ni el naranja/verde neón de apps de delivery. Paleta terrosa y orgánica, tipografía sobria, mucho aire, fotografía real de propiedades como protagonista.

La audiencia tiene dos caras distintas y el diseño debe reflejarlo:
- **Panel de agentes/gerentes/admin**: denso en datos, orientado a tareas (tablas, formularios, dashboards). Aquí la prioridad es claridad y velocidad, no espectáculo.
- **Catálogo público**: orientado a la propiedad como objeto de deseo. Aquí la fotografía manda, el texto acompaña.

No trates ambos con el mismo nivel de ornamento — el panel interno es más plano y funcional; el catálogo público se permite más aire y jerarquía visual.

## 2. Paleta de colores

Cinco colores base, sin inventar tonos fuera de esta familia salvo los estados semánticos (éxito/error/advertencia) definidos abajo.

| Token | Hex | Rol |
|---|---|---|
| `--evergreen` | `#0A3B35` | Color de marca / ancla. Texto de alto contraste, botones primarios, header del panel interno, footer del catálogo. |
| `--emerald-depths` | `#2A6151` | Secundario. Hover/active de elementos primarios, iconografía activa, acentos de interacción. |
| `--ash-grey` | `#B2B7AA` | Neutro frío-verdoso. Bordes, divisores, texto secundario/deshabilitado, placeholders. |
| `--floral-white` | `#FCF7F0` | Fondo base. Reemplaza al blanco puro en toda la UI — nunca uses `#FFFFFF` liso como fondo de página. |
| `--pale-oak` | `#D8C2A4` | Acento cálido. Badges de estado neutro, fondos de tarjetas destacadas, separadores decorativos, hover suave sobre fondo claro. |

**Reglas duras:**
- Nunca colores fluorescentes o saturados fuera de esta paleta (nada de azules eléctricos, verdes neón, rosados chillones).
- El contraste evergreen-sobre-floral-white es el par de alto contraste por defecto para texto — evita negro puro (`#000`/`#111`) en cualquier parte de la UI.
- Estados semánticos (no vienen de la paleta de marca, son la única excepción): éxito `#3A7D5C` (verde, cercano a la familia), advertencia `#B8863B` (ámbar terroso, no amarillo puro), error `#A94438` (rojo terracota, no rojo puro de alerta). Todos deben sentirse parte de la misma familia tierra, no colores de sistema genéricos pegados encima.
- Un solo color de acento "vivo" por vista. No mezcles emerald-depths y pale-oak como acento competidor en el mismo componente.

## 3. Tipografía

Dos familias, roles claramente distintos — nunca las mezcles dentro del mismo nivel de jerarquía.

- **Montserrat** — títulos, nombres de propiedades en tarjetas, cifras grandes (precio), navegación principal. Pesos: 600 (semibold) para títulos de sección, 700 (bold) solo para el precio destacado o el hero. Nunca uses 800/900 — se ve genérico y gritón.
- **Roboto** — todo el cuerpo de texto: descripciones, labels de formulario, tablas, botones, texto de ayuda. Peso 400 por defecto, 500 para labels y botones.

**Escala tipográfica** (base 16px, ratio ~1.25):
```
12px  — metadata, timestamps, badges
14px  — texto secundario, labels de formulario
16px  — cuerpo base
20px  — subtítulos de tarjeta, nombres de agente
25px  — títulos de sección
31px  — título de página (panel interno)
39px  — hero / precio destacado en detalle de propiedad
```

**Reglas duras:**
- Líneas de texto corridas (descripciones) nunca más de ~75 caracteres de ancho.
- Nada de mayúsculas sostenidas para labels ("DISPONIBLE" no; "Disponible" sí). Si necesitas distinguir un badge de estado, usa peso de fuente y color, no mayúsculas.
- No acentúes una sola palabra de un título con cursiva/color/negrita distinta al resto — si el título necesita énfasis, todo el título lleva ese peso, no una palabra suelta.

## 4. Layout y espaciado

Grid de 8px para todo el espaciado (paddings, gaps, márgenes: 8, 16, 24, 32, 48, 64).

- **Catálogo público**: alineación centrada para contenido narrativo (hero, secciones de marketing), alineación a la izquierda para grillas de propiedades y formularios.
- **Panel interno** (agentes/oficinas/leads): siempre alineado a la izquierda, layout de app clásica — sidebar fijo + contenido, nunca centrado como una landing.
- Border-radius: un solo valor consistente por contexto — 6px para inputs/botones, 12px para tarjetas de propiedad e imágenes. No mezcles radios distintos sin motivo estructural (un modal puede llevar un radio mayor porque flota sobre todo lo demás; una tarjeta de lista no).
- Sombras: una sola sombra suave de marca, no la sombra gris genérica de cualquier UI kit. Preferible un borde sutil en `ash-grey` sobre `floral-white` antes que una sombra pesada — la paleta terrosa se ve mejor con bordes que con drop-shadows oscuros.

## 5. Imágenes e iconos

- La fotografía de propiedades es el elemento hero del catálogo — nunca la comprimas en miniaturas diminutas cuando hay espacio de sobra. Deja que respire.
- Usa `object-fit: cover` con relación de aspecto fija (4:3 o 16:9, consistente en toda una misma grilla) para que el catálogo no se vea irregular.
- Iconos: **line icons** (trazo fino, 1.5–2px), nunca iconos rellenos sólidos ni estilo 3D/glassmorphism. Color evergreen o ash-grey según jerarquía (activo vs inactivo), nunca a color de marca secundario suelto.
- **Cero emojis en cualquier parte de la interfaz** — ni en botones, ni en badges de estado, ni en notificaciones. Si necesitas indicar un estado visualmente, usa color + icono de línea, nunca un emoji.

## 6. Componentes — evitar el kit genérico de SaaS

Esto viene directo de patrones que se repiten en cualquier generación de UI por defecto — evítalos activamente:

- No metas todo el contenido en tarjetas idénticas con el mismo radio y la misma sombra gris — varía el tratamiento según jerarquía (una tarjeta de propiedad destacada no debe verse igual que una fila de tabla de leads).
- Nada de eyebrows en mayúsculas espaciadas ("PROPIEDADES DESTACADAS") encima de cada sección — si el título ya lo dice, no hace falta la etiqueta decorativa arriba.
- Nada de flechitas "→" pegadas a botones o enlaces por costumbre — solo si el botón realmente navega hacia adelante en un flujo (ej. "Siguiente →" en un wizard), no en cualquier CTA.
- Botones: texto en modo oración, verbo de acción claro y en voz activa ("Publicar propiedad", no "Enviar" ni "Submit"). El nombre de la acción se mantiene igual en toda la confirmación (si el botón dice "Publicar", el mensaje de éxito dice "Propiedad publicada", no "¡Listo!").
- Estados vacíos y errores: tono directo, sin disculpas ni humor forzado. "Aún no tienes propiedades publicadas" + acción clara, no "¡Ups! Parece que no hay nada por aquí 👀" (y sin emoji, como ya se dijo).

## 7. Movimiento

Uso mínimo y con propósito — nunca decorativo por defecto.
- Transiciones de hover suaves (150–200ms) en elementos interactivos.
- Evita fade-in-slide-up en cada sección al hacer scroll — es el efecto por defecto de cualquier generador de UI y no aporta nada aquí.
- Reserva cualquier animación más elaborada (una transición de página, una revelación) para un único momento con intención clara (ej. la transición al abrir el detalle de una propiedad desde su tarjeta).

## 8. Stack técnico — cómo aplicar esto

- **React + Vite** como base del proyecto.
- **Tailwind CSS** — define los cinco colores de marca como tokens en `tailwind.config` (no los hardcodees como valores hex sueltos en cada componente):
  ```js
  colors: {
    evergreen: '#0A3B35',
    'emerald-depths': '#2A6151',
    'ash-grey': '#B2B7AA',
    'floral-white': '#FCF7F0',
    'pale-oak': '#D8C2A4',
  }
  ```
  Fuentes vía `font-family` con Montserrat (`font-display`) y Roboto (`font-sans`) importadas de Google Fonts o self-hosted.
- **shadcn/ui** como base de componentes — pero re-témalos con estos tokens antes de usarlos tal cual; los componentes de shadcn por defecto vienen con radios, sombras y paleta grises que hay que sobreescribir para que no se vean genéricos, siguiendo las reglas de la sección 4 y 6.

### Estructura del proyecto y documentación de contexto

Con nueve microservicios detrás, el contexto de cada uno vive en su propio par de archivos — así Claude Code solo carga lo que necesita para la tarea puntual, no los nueve de golpe.

```
realtyhub-frontend/
├── CLAUDE.md                          ← raíz: convenciones generales + índice a /docs
├── docs/
│   ├── design-guide.md                ← este archivo
│   ├── openapi/
│   │   ├── auth-service.json          ← spec OpenAPI/Swagger exportada tal cual de Spring
│   │   ├── user-service.json
│   │   ├── property-service.json
│   │   ├── lead-service.json
│   │   └── ...                        ← uno nuevo por cada servicio que se agregue
│   ├── auth-service-notas.md          ← solo lo que el JSON no cubre (ver abajo)
│   ├── user-service-notas.md
│   ├── property-service-notas.md
│   └── lead-service-notas.md
├── src/
│   ├── api/
│   │   ├── client.js                  ← instancia base (axios/fetch), interceptores de token
│   │   ├── authApi.js                 ← generado a partir de openapi/auth-service.json
│   │   ├── userApi.js                 ← generado a partir de openapi/user-service.json
│   │   ├── propertyApi.js             ← generado a partir de openapi/property-service.json
│   │   └── leadApi.js                 ← generado a partir de openapi/lead-service.json
│   ├── components/
│   ├── pages/
│   └── ...
```

**Los `.json` en `docs/openapi/`** son la fuente de verdad real — la spec que exporta Spring directo de los controllers (springdoc-openapi), nunca queda desactualizada respecto al backend porque se regenera del código mismo. De ahí sale la forma exacta de cada endpoint, DTO y código de respuesta.

**Los `*-notas.md`** son deliberadamente cortos — solo cubren lo que el JSON no puede expresar:
- Los headers `X-User-Id` / `X-User-Role` que simulan al Gateway (a menos que estén anotados con `@Parameter` en Spring, Swagger no los va a mostrar).
- Reglas de negocio no obvias desde la spec (ej. "solo el agente dueño puede editar, con excepción de ADMINISTRADOR_CENTRAL", transiciones de estado permitidas).

**`src/api/*.js`**: no los escribas a mano — pídele a Claude Code que los genere leyendo el `.json` correspondiente más su `-notas.md`, un archivo de servicio por vez. `client.js` centraliza la URL base y el manejo del token, y cada `*Api.js` lo importa en vez de repetir esa configuración.

**`CLAUDE.md` raíz**: solo el índice y las convenciones generales (cómo correr el proyecto, estructura de carpetas, stack) — nunca el detalle completo de cada servicio, eso vive en `/docs`.

## 9. Checklist rápido antes de dar por terminado un componente

- [ ] ¿Usa solo los 5 colores de marca + los 3 semánticos definidos?
- [ ] ¿Montserrat solo en títulos/cifras, Roboto en todo lo demás?
- [ ] ¿Cero emojis, cero mayúsculas sostenidas en labels, cero flechitas decorativas?
- [ ] ¿El fondo es `floral-white`, no blanco puro?
- [ ] ¿Las imágenes de propiedad tienen espacio real para respirar, no miniaturas apretadas?
- [ ] ¿El panel interno se ve como herramienta de trabajo (izquierda, denso) y el catálogo público como vitrina (más aire, fotografía primero)?
