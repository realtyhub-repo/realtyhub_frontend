# Lead Service

Puerto **8084** · Base path `/leads` · Se accede por el Gateway (`http://localhost:8080/leads/...`).

Gestiona los leads (clientes interesados en una propiedad). Al crear un lead el cliente elige fecha y hora de visita; el servicio escoge un agente **libre a esa hora** y reserva la visita en el Visitas Service.

## Autenticación

El Gateway valida el JWT y reenvía dos headers. El servicio solo confía en ellos:

| Header | Valor |
|---|---|
| `X-User-Id` | UUID del usuario |
| `X-User-Role` | `ADMINISTRADOR_CENTRAL`, `GERENTE_OFICINA`, `AGENTE`, `CLIENTE` |

## Modelo

**Estados del lead:** `CONTACTADO`, `VISITA_AGENDADA`, `OFERTA_PRESENTADA`, `NEGOCIACION`, `OFERTA_ACEPTADA`, `CERRADO`, `DESCARTADO` (los dos últimos son terminales).

`OFERTA_ACEPTADA` indica que el cliente aceptó la oferta. Al entrar a este estado el servicio publica el evento `lead.oferta_aceptada`, que el Contratos Service consume para generar el borrador del contrato.
**Canal de origen:** `WEB`, `WHATSAPP`, `LLAMADA`.

`LeadResponse`
```json
{
  "id": "uuid",
  "propiedadId": "uuid",
  "clienteId": "uuid",
  "estado": "VISITA_AGENDADA",
  "agenteId": "uuid",
  "visitaId": "uuid",
  "fechaHoraVisita": "2026-10-20T10:00:00"
}
```

## Endpoints

### `POST /leads` — Crear lead y agendar visita
Rol: **CLIENTE**.

Body:
```json
{ "propiedadId": "uuid", "fechaHora": "2026-10-20T10:00:00" }
```
Respuesta `201` → `LeadResponse`.

Flujo: valida rol, lead duplicado y que la propiedad esté DISPONIBLE → toma agentes de las 5 oficinas más cercanas → descarta los ocupados a esa hora → ordena por zona, carga y conversión → reserva la visita con el primero libre (si está ocupado por una carrera, prueba el siguiente) → guarda el lead. Si el guardado falla, cancela la visita (compensación).

### `POST /leads/{id}/visitas` — Otra visita sobre un lead existente
Rol: **CLIENTE** dueño del lead. Body: `{ "fechaHora": "..." }`. Respuesta `201` → `LeadResponse`.
Usa el agente ya asignado al lead y exige que la propiedad siga DISPONIBLE. Solo pasa de `CONTACTADO` a `VISITA_AGENDADA`.

### `PUT /leads/{id}/estado` — Cambiar estado
Rol: agente dueño del lead o administrador. Body: `{ "nuevoEstado": "NEGOCIACION" }`. Respuesta `204`.
Un lead en `CERRADO` o `DESCARTADO` no se puede modificar.

Si `nuevoEstado` es `OFERTA_ACEPTADA` y el lead no estaba ya en ese estado, se publica el evento `lead.oferta_aceptada` (ver [Eventos](#eventos)). Repetir el mismo estado no vuelve a publicar.

### `GET /leads/mis-leads?estado=` — Mis leads
Leads del agente autenticado; `estado` es opcional. Respuesta `200` → `List<LeadResponse>`.

### `GET /leads/{id}` — Detalle
Agente dueño o administrador. Respuesta `200` → `LeadDetalleResponse` (`id, propiedadId, estado, clienteId, nombreCliente, telefonoCliente, emailCliente, agenteId, createdAt`).

## Errores

Formato: `{ "codigo": "...", "mensaje": "...", "status": 409, "timestamp": "..." }`

| Código | HTTP | Cuándo |
|---|---|---|
| `SOLICITUD_INVALIDA` | 400 | Body/parámetros faltantes o con formato inválido |
| `FECHA_VISITA_INVALIDA` | 400 | Fecha pasada o fuera de horario (08:00–18:00, hora Colombia) |
| `ERROR_CLIENTE_HTTP` | 400 | Error 4xx al llamar a otro servicio |
| `CONTEXTO_INVALIDO` | 401 | Faltan o son inválidos `X-User-Id` / `X-User-Role` |
| `ACCESO_NO_AUTORIZADO` | 403 | El rol o usuario no tiene permiso |
| `LEAD_NO_ENCONTRADO` | 404 | El lead no existe |
| `PROPIEDAD_NO_ENCONTRADA` | 404 | La propiedad no existe o no está disponible |
| `LEAD_DUPLICADO` | 409 | Ya hay un lead activo del cliente para esa propiedad |
| `SIN_AGENTES_DISPONIBLES` | 409 | Ningún agente libre a esa hora |
| `AGENTE_OCUPADO` | 409 | El agente se ocupó mientras se reservaba |
| `PROPIEDAD_OCUPADA` | 409 | La propiedad ya tiene visita a esa hora |
| `VISITA_YA_EXISTE` | 409 | El lead ya tiene una visita programada |
| `ESTADO_TERMINAL` | 409 | El lead está CERRADO o DESCARTADO |
| `VISITAS_NO_DISPONIBLE` | 503 | Visitas no responde (el servicio falla cerrado) |

## Eventos

Se publican en RabbitMQ, exchange `realtyhub.events` (topic, durable), con serialización JSON.

| Routing key | Cuándo | Consumidor |
|---|---|---|
| `lead.oferta_aceptada` | El lead pasa a `OFERTA_ACEPTADA` | Contratos Service |

Payload de `lead.oferta_aceptada`:
```json
{
  "leadId": "uuid",
  "propiedadId": "uuid",
  "clienteId": "uuid",
  "agenteId": "uuid"
}
```

El evento se envía dentro de la transacción del cambio de estado y no hay patrón outbox: si RabbitMQ no está disponible en ese momento, el cambio de estado falla y se puede reintentar. Contratos lo procesa de forma idempotente (un contrato por `leadId`).

Variables de entorno de RabbitMQ: `RABBITMQ_HOST` (localhost), `RABBITMQ_PORT` (5672), `RABBITMQ_USER` (guest), `RABBITMQ_PASSWORD` (guest).

## Dependencias

User Service (8082), Property Service (8083), Visitas Service (8085, endpoints `/internal/**`), RabbitMQ (publica `lead.oferta_aceptada`), PostgreSQL. Migraciones con Flyway (`db/migration`).

## Documentación interactiva

Con el servicio corriendo: Swagger UI `http://localhost:8084/swagger-ui.html` · JSON `http://localhost:8084/v3/api-docs`. Para guardar el JSON: `docs/generar-openapi.ps1`.
