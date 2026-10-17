# Diseño del frontend: Leads

Este documento describe cómo debe ser la interfaz de **Leads**. Complementa el contexto del microservicio y los `.json` de OpenAPI de la carpeta de endpoints en `docs`. Si algo de aquí contradice los `.json`, mandan los `.json` para los contratos de la API, y este documento manda para la experiencia de usuario.

## Qué es un lead

Un lead es un cliente interesado en una propiedad. Nace cuando el cliente agenda una visita y el sistema le asigna un agente libre. Después el agente lo mueve por un pipeline de ventas hasta cerrarlo. Cuando el lead llega a `OFERTA_ACEPTADA`, el backend genera solo el borrador del contrato.

Estados, en orden: `CONTACTADO`, `VISITA_AGENDADA`, `OFERTA_PRESENTADA`, `NEGOCIACION`, `OFERTA_ACEPTADA`, `CERRADO`, `DESCARTADO`. Los dos últimos son finales: el lead ya no se puede modificar.

## Roles y qué ve cada uno

| Rol | Qué hace en Leads |
|---|---|
| `CLIENTE` | Crea un lead al agendar una visita. Puede agendar otra visita sobre un lead suyo. No ve el pipeline. |
| `AGENTE` | Ve y mueve sus leads. Ve los datos de contacto del cliente. |
| `ADMINISTRADOR_CENTRAL` | Puede ver el detalle y cambiar el estado de cualquier lead. |
| `GERENTE_OFICINA` | Sin acciones propias en Leads por ahora. |

Muestra u oculta pantallas y botones según el rol y el estado. La seguridad real la hace el backend, pero un botón que va a devolver 403 es mala experiencia.

## Pantallas

### 1. Agendar visita (cliente, desde el detalle de una propiedad)

Esta es la pantalla más delicada, porque junta disponibilidad, asignación de agente y teléfono.

Elementos:
- Selector de fecha. No permite fechas pasadas.
- Cuadrícula de horas de 08:00 a 17:00 en bloques de una hora (cada visita dura 60 minutos y debe terminar antes de las 18:00).
- Las horas ocupadas aparecen deshabilitadas. Salen de `GET /visitas/propiedad/{propiedadId}/ocupacion?fecha=`. Si la respuesta es `[]`, todo el día está libre.
- Campo de teléfono, obligatorio (ver abajo).
- Botón "Agendar visita".

Flujo:
1. El cliente elige la fecha. Se piden las franjas ocupadas de ese día y se pintan las horas.
2. El cliente elige una hora libre.
3. Si el cliente no tiene teléfono guardado, se le pide aquí mismo. Se consulta con `GET /users/me` (campo `telefono`) y, si falta o lo cambia, se guarda con `PUT /users/me` enviando solo `{ "telefono": "..." }`. El backend todavía no obliga al teléfono; **el frontend debe exigirlo antes de permitir agendar**.
4. Al confirmar se llama `POST /leads` con `{ propiedadId, fechaHora }`.
5. Éxito (`201`): pantalla de confirmación con fecha, hora y el nombre del agente asignado, y un enlace a "Mis visitas".

Reglas de la interfaz:
- Que una hora salga libre en `ocupacion` no garantiza que haya un agente libre. El backend puede responder `SIN_AGENTES_DISPONIBLES` o `AGENTE_OCUPADO`. En ese caso no muestres un error genérico: vuelve a pedir las franjas, deja el formulario como estaba y avisa "esa hora ya no está disponible, elige otra".
- Deshabilita el botón mientras la petición está en curso, para evitar doble envío.
- Si el cliente ya tiene un lead activo para esa propiedad, la API responde `LEAD_DUPLICADO`. Muestra un mensaje claro y ofrece ir a "Mis visitas" o, si existe un lead, a agendar otra visita sobre el mismo.

### 2. Pipeline de leads (agente)

Vista principal del agente.

- Tablero tipo kanban con una columna por estado activo: `CONTACTADO`, `VISITA_AGENDADA`, `OFERTA_PRESENTADA`, `NEGOCIACION`, `OFERTA_ACEPTADA`.
- `CERRADO` y `DESCARTADO` van en una vista aparte (pestaña o filtro "Finalizados"), no en el tablero.
- Datos de la llamada: `GET /leads/mis-leads`, con `estado` como filtro opcional.
- Cada tarjeta muestra la propiedad, la fecha de la visita si existe y el estado. La lista de `mis-leads` no trae los datos del cliente; esos se ven en el detalle.
- Cambiar de estado: arrastrar la tarjeta o usar un menú en la tarjeta (`PUT /leads/{id}/estado`, responde `204`). Si no se implementa arrastrar y soltar, el menú es suficiente.
- Al mover a `OFERTA_ACEPTADA`, muestra una confirmación: "Esto generará el borrador del contrato". Después del cambio, ofrece ir a la lista de contratos. El borrador aparece unos segundos más tarde, así que no asumas que ya existe al instante.
- Si el servidor responde `ESTADO_TERMINAL`, recarga el lead y quita el selector de estado.

### 3. Detalle del lead (agente)

Datos de `GET /leads/{id}`:
- Cliente: nombre, teléfono, correo. El teléfono debe tener botones de llamar (`tel:`) y de WhatsApp. El correo, un `mailto:`.
- Estado actual y propiedad (enlace al detalle de la propiedad).
- Selector de estado, solo si el lead no es final.
- Si existe un contrato asociado, un enlace al contrato.
- Si el teléfono viene vacío, muestra "Sin teléfono registrado" en vez de dejar el hueco.

### 4. Agendar otra visita sobre un lead (cliente)

Mismo selector de fecha y hora que la pantalla 1, pero llamando a `POST /leads/{id}/visitas` con `{ fechaHora }`. Usa el mismo agente que ya tenía el lead, y la propiedad debe seguir disponible.

## Mensajes de error

Decide qué mostrar por el campo `codigo`, nunca por el texto de `mensaje`.

| Código | Qué mostrar |
|---|---|
| `FECHA_VISITA_INVALIDA` | "Elige una fecha futura entre las 8:00 y las 17:00." |
| `SIN_AGENTES_DISPONIBLES` | "No hay agentes libres a esa hora. Prueba con otra." |
| `AGENTE_OCUPADO` | "Esa hora acaba de ocuparse. Elige otra." |
| `PROPIEDAD_OCUPADA` | "Ya hay una visita en esa franja." |
| `LEAD_DUPLICADO` | "Ya tienes una solicitud activa para esta propiedad." |
| `VISITA_YA_EXISTE` | "Este lead ya tiene una visita programada." |
| `PROPIEDAD_NO_ENCONTRADA` | "La propiedad ya no está disponible." |
| `ESTADO_TERMINAL` | "Este lead ya está cerrado o descartado." |
| `ACCESO_NO_AUTORIZADO` | "No tienes permiso para esta acción." |
| `CONTEXTO_INVALIDO` (401) | Renovar sesión o ir al login. |
| `VISITAS_NO_DISPONIBLE` (503) | "El servicio de visitas no responde. Intenta de nuevo." con botón de reintentar. |

## Estados de la interfaz

Cada pantalla debe cubrir: cargando (esqueletos o spinner), vacío (por ejemplo "Aún no tienes leads"), error con opción de reintentar y éxito. Después de cualquier cambio de estado, actualiza la tarjeta con los datos del servidor, no solo de forma local.

## Fechas

Las fechas llegan y se envían en hora de Colombia, sin zona horaria: `2026-10-20T10:00:00`. Muéstralas tal cual. No conviertas zonas horarias ni sumes el desfase del navegador.

## Lo que no existe todavía

- No hay un endpoint de perfil del agente. El nombre del agente debe ser un enlace a la ruta `/agentes/:agenteId`, que puede ser una pantalla provisional hasta que el backend lo ofrezca.
- `mis-leads` no incluye el nombre del cliente, solo el detalle.
- El teléfono obligatorio lo valida solo el frontend por ahora.
