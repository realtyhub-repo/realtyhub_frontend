# Diseño del frontend: Visitas

Este documento describe cómo debe ser la interfaz de **Visitas**. Complementa el contexto del microservicio y los `.json` de OpenAPI de la carpeta de endpoints en `docs`. Si algo de aquí contradice los `.json`, mandan los `.json` para los contratos de la API, y este documento manda para la experiencia de usuario.

## Qué es una visita

Una visita es una cita para ver una propiedad. **No se crea desde Visitas**: se crea al agendar un lead (`POST /leads`) o al agendar otra visita sobre un lead existente (`POST /leads/{id}/visitas`). Desde Visitas el frontend consulta disponibilidad, lista visitas y cambia su estado.

Reglas que afectan la interfaz:
- Cada visita dura 60 minutos. La hora de inicio va de 08:00 a 17:00; la visita termina antes de las 18:00 y el mismo día.
- No se cruzan visitas del mismo agente ni de la misma propiedad. Las canceladas no bloquean.
- Un lead tiene como máximo una visita `PROGRAMADA` a la vez.
- Estados: `PROGRAMADA`, que puede pasar a `REALIZADA` o `CANCELADA`. Los dos últimos son finales.
- Cuando una propiedad pasa a `VENDIDO` o `ALQUILADO`, el backend cancela solo las visitas futuras `PROGRAMADA` de esa propiedad.

## Forma de una visita

```json
{
  "id": "uuid",
  "propiedadId": "uuid",
  "clienteId": "uuid",
  "agenteId": "uuid",
  "nombreAgente": "Juan Pérez",
  "leadId": "uuid",
  "fechaHora": "2026-10-20T10:00:00",
  "fechaHoraFin": "2026-10-20T11:00:00",
  "estadoVisita": "PROGRAMADA"
}
```

`nombreAgente` puede venir `null` si el servicio de usuarios no respondió. En ese caso muestra "Agente asignado" y no rompas la pantalla. `agenteId` sirve para enlazar al perfil del agente.

## Roles y qué ve cada uno

| Rol | Qué hace en Visitas |
|---|---|
| `CLIENTE` | Ve sus visitas. Puede cancelar las suyas. |
| `AGENTE` | Ve las visitas donde es el agente. Puede marcarlas como realizadas o cancelarlas. |
| `ADMINISTRADOR_CENTRAL` | Puede cambiar el estado de cualquier visita. |

`GET /visitas/mis-visitas` ya filtra según el rol: el cliente recibe sus visitas y los demás roles reciben las visitas donde son el agente.

## Pantallas

### 1. Selector de fecha y hora (componente reutilizable)

Se usa al agendar un lead y al agendar otra visita. Debe ser un componente aparte para reutilizarlo.

- Entrada: `propiedadId`.
- Un selector de fecha, sin fechas pasadas.
- Al elegir el día, llama a `GET /visitas/propiedad/{propiedadId}/ocupacion?fecha=AAAA-MM-DD`.
- Genera las horas de 08:00 a 17:00 en bloques de una hora y deshabilita las que se crucen con alguna franja ocupada. Una franja cruza si la hora de inicio cae dentro de `[fechaHora, fechaHoraFin)` de la franja ocupada.
- Respuesta `[]` significa día completamente libre. No es un error.
- Un `propiedadId` inexistente también devuelve `[]`; esta llamada no sirve para validar propiedades.
- Salida: la `fechaHora` elegida, en formato `AAAA-MM-DDTHH:mm:00`.
- Que una hora esté libre aquí no asegura que haya un agente disponible; esa validación ocurre al crear el lead.

### 2. Mis visitas (cliente)

- Lista ordenada por fecha. Cada tarjeta muestra la propiedad, la fecha y hora, el nombre del agente (enlace a su perfil por `agenteId`) y un chip con el estado.
- Filtro por estado. Por defecto, `PROGRAMADA`.
- Rango por defecto: desde hoy hasta 30 días. Ofrece un selector de rango; se envía como `desde` y `hasta` en formato `AAAA-MM-DDTHH:mm:ss`. Si `desde` es posterior a `hasta`, la API responde `SOLICITUD_INVALIDA` o `FECHA_INVALIDA`: valida antes de enviar.
- Botón "Cancelar" solo en las visitas `PROGRAMADA`, con confirmación. Llama a `PATCH /visitas/{id}/estado` con `{ "nuevoEstado": "CANCELADA" }`.
- Las visitas `REALIZADA` y `CANCELADA` no muestran acciones.
- Si una visita fue cancelada automáticamente porque la propiedad se vendió o alquiló, simplemente aparecerá como `CANCELADA` al refrescar. Si quieres, puedes mostrar una nota "Propiedad no disponible" cuando la propiedad ya no esté disponible.

### 3. Agenda (agente)

- Vista de calendario semanal con las visitas del agente, usando `mis-visitas` con `desde` y `hasta` para la semana visible.
- Cada visita es un bloque de una hora. El color depende del estado.
- Al abrir una visita: datos de la propiedad y del cliente (el cliente se consulta desde el detalle del lead con `leadId`), y las acciones:
  - "Marcar como realizada": solo habilitada si `fechaHora` ya pasó. Si no, el backend responde `TRANSICION_INVALIDA`.
  - "Cancelar".
- Después de cada acción, actualiza el bloque con la respuesta (`200` con la visita actualizada).
- Una visita `REALIZADA` o `CANCELADA` no ofrece acciones.

## Mensajes de error

Decide qué mostrar por el campo `codigo`, nunca por el texto de `mensaje`.

| Código | Qué mostrar |
|---|---|
| `SOLICITUD_INVALIDA` | "Revisa los datos enviados." |
| `FECHA_INVALIDA` | "La fecha no es válida." |
| `FUERA_DE_HORARIO` | "Las visitas son entre las 8:00 y las 18:00." |
| `AGENTE_OCUPADO` | "El agente tiene otra visita en esa hora." |
| `PROPIEDAD_OCUPADA` | "La propiedad ya tiene una visita en esa franja." Refresca las franjas. |
| `VISITA_YA_EXISTE` | "Este lead ya tiene una visita programada." |
| `TRANSICION_INVALIDA` | "Esta visita ya no se puede modificar." Recarga el estado. |
| `VISITA_NO_ENCONTRADA` | "La visita no existe." |
| `ACCESO_NO_AUTORIZADO` | "No tienes permiso sobre esta visita." |
| `CONTEXTO_INVALIDO` (401) | Renovar sesión o ir al login. |

## Estados de la interfaz

Cada pantalla debe cubrir: cargando, vacío (por ejemplo "No tienes visitas programadas"), error con reintento y éxito. `mis-visitas` hace consultas adicionales para traer el nombre del agente, así que puede tardar un poco más: usa esqueletos de carga. Tras cada cambio de estado, actualiza con los datos del servidor.

## Fechas

Las fechas llegan y se envían en hora de Colombia, sin zona horaria: `2026-10-20T10:00:00`. Muéstralas tal cual. No conviertas zonas horarias ni sumes el desfase del navegador.

## Lo que no existe todavía

- No hay un endpoint de perfil del agente. El nombre del agente debe ser un enlace a la ruta `/agentes/:agenteId`, que puede ser una pantalla provisional hasta que el backend lo ofrezca.
- La respuesta incluye `nombreAgente` solo cuando se despliegue el cambio del backend. Mientras tanto puede no venir; trátalo como opcional.
- Si Visitas responde 404 en todas las rutas, probablemente falta la ruta `/visitas/**` en el Gateway. Es un tema del backend.
