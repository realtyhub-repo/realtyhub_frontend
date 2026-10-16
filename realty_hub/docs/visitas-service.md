# Visitas Service

Puerto **8085** · Base path `/visitas` (público) e `/internal/visitas` (solo servicio a servicio).

Agenda de visitas. Garantiza que un agente o una propiedad no tengan dos visitas que se crucen.

> `/internal/**` lo usa Lead directamente y **no debe enrutarse por el Gateway**. El Gateway necesita la ruta `/visitas/**` → 8085.

## Autenticación

Headers que inyecta el Gateway: `X-User-Id` (UUID) y `X-User-Role` (`ADMINISTRADOR_CENTRAL`, `GERENTE_OFICINA`, `AGENTE`, `CLIENTE`).

## Reglas

- Fechas `LocalDateTime` en hora de Colombia (`America/Bogota`).
- Duración fija: **60 min** (`visitas.duracion-minutos`). El fin = inicio + duración. Solo el inicio se trunca a minutos.
- Horario: **08:00 – 18:00**, inicio y fin el mismo día (`visitas.hora-apertura` / `hora-cierre`).
- No se solapan visitas del mismo agente ni de la misma propiedad (Postgres `EXCLUDE USING gist` + validación previa). Las `CANCELADA` no bloquean.
- Un lead tiene como máximo una visita `PROGRAMADA` a la vez; puede tener más después.
- `agenteId` es el `usuarioId` del agente.

**Estados:** `PROGRAMADA` → `REALIZADA` | `CANCELADA`.

`VisitaResponse`
```json
{
  "id": "uuid", "propiedadId": "uuid", "clienteId": "uuid", "agenteId": "uuid", "leadId": "uuid",
  "fechaHora": "2026-10-20T10:00:00", "fechaHoraFin": "2026-10-20T11:00:00",
  "estadoVisita": "PROGRAMADA"
}
```

## Endpoints públicos

### `GET /visitas/propiedad/{propiedadId}/ocupacion?fecha=2026-10-20`
Franjas ocupadas de la propiedad ese día (para pintar el calendario). `200` → `[{ "fechaHora": "...", "fechaHoraFin": "..." }]`.

### `GET /visitas/mis-visitas?estado=&desde=&hasta=`
CLIENTE ve sus visitas; los demás roles ven las visitas donde son agente. Por defecto desde el inicio de hoy hasta 30 días. `desde`/`hasta` en ISO date-time. `200` → `List<VisitaResponse>`.

### `PATCH /visitas/{id}/estado`
Body `{ "nuevoEstado": "REALIZADA" }`. `200` → `VisitaResponse`.
Solo desde `PROGRAMADA`. `REALIZADA` únicamente si la hora de inicio ya pasó. El cliente puede cancelar su propia visita.

## Endpoints internos

### `GET /internal/visitas/agentes-ocupados?agenteIds=<uuid>&agenteIds=<uuid>&fechaHora=...`
`200` → `{ "agentesIds": ["uuid"] }` (los que ya tienen una visita que se cruza).

### `POST /internal/visitas/reservar`
```json
{ "leadId": "uuid", "propiedadId": "uuid", "clienteId": "uuid", "agenteId": "uuid", "fechaHora": "2026-10-20T10:00:00" }
```
`201` → `VisitaResponse`.

### `DELETE /internal/visitas/lead/{leadId}`
Cancela la visita programada del lead (compensación). Idempotente, `204`.

## Errores

Formato: `{ "codigo": "...", "mensaje": "...", "status": 409, "timestamp": "..." }`

| Código | HTTP | Cuándo |
|---|---|---|
| `SOLICITUD_INVALIDA` | 400 | Body/parámetros faltantes o con formato inválido |
| `FECHA_INVALIDA` | 400 | Fecha en el pasado |
| `FUERA_DE_HORARIO` | 400 | Fuera de 08:00–18:00 o cruza de día |
| `CONTEXTO_INVALIDO` | 401 | Headers de identidad inválidos |
| `ACCESO_NO_AUTORIZADO` | 403 | Sin permiso sobre la visita |
| `VISITA_NO_ENCONTRADA` | 404 | La visita no existe |
| `AGENTE_OCUPADO` | 409 | El agente tiene una visita que se cruza |
| `PROPIEDAD_OCUPADA` | 409 | La propiedad tiene una visita que se cruza |
| `VISITA_YA_EXISTE` | 409 | El lead ya tiene una visita PROGRAMADA |
| `TRANSICION_INVALIDA` | 409 | Cambio de estado no permitido |

## Base de datos

PostgreSQL con Flyway (`db/migration`, V1). Requiere la extensión `btree_gist`.

## Documentación interactiva

Con el servicio corriendo: Swagger UI `http://localhost:8085/swagger-ui.html` · JSON `http://localhost:8085/v3/api-docs`. Para guardar el JSON: `docs/generar-openapi.ps1`.
