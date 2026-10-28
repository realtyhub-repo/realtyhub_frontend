# Analytics service

Puerto 8089, detrás del Gateway bajo `/analitica`. Consume eventos de RabbitMQ (`lead.*` y `propiedad.vista`) y los agrega en MongoDB. El frontend no envía `X-User-Id` ni `X-User-Role`.

## Endpoints

| Método y ruta | Acceso | Respuesta |
|---|---|---|
| `GET /analitica/propiedades/mas-vistas?dias=30&limite=10` | Público | `[{ propiedadId, vistas }]` de mayor a menor. `dias` 1-365, `limite` 1-50 |
| `GET /analitica/leads/conversion-por-agente?desde&hasta` | Admin, gerente, agente | `[{ agenteId, nombre, totalLeads, cerrados, descartados, activos, tasaConversion }]` |
| `GET /analitica/leads/tiempo-promedio-cierre?desde&hasta` | Admin, gerente, agente | `{ leadsCerrados, promedioHoras, porAgente: [{ agenteId, nombre, leadsCerrados, promedioHoras }] }` |
| `GET /analitica/leads/por-canal?desde&hasta` | Admin, gerente, agente | `[{ canalOrigen, totalLeads, cerrados, tasaConversion }]` |

`desde` y `hasta` son `yyyy-MM-dd` y filtran por fecha de creación del lead.

## Alcance por rol

- ADMINISTRADOR_CENTRAL: todos los leads.
- GERENTE_OFICINA: los agentes de su oficina. Sin oficina asignada devuelve listas vacías.
- AGENTE: solo sus leads.
- CLIENTE: 403 `ACCESO_NO_AUTORIZADO`.

`agenteId` es el id del usuario, no el id de la tabla `agente`. `nombre` puede venir `null` para el agente.

## Reglas que el JSON no cubre

- `mas-vistas` solo devuelve ids y conteos. Las tarjetas se piden con `GET /propiedades/por-ids?ids=` (no cuenta como vista; no uses `GET /propiedades/{id}` para pintar listas).
- El home cae al listado normal si Analytics no responde o hay menos de cinco propiedades disponibles con vistas.
- `tasaConversion` = cerrados / totalLeads, entre 0 y 1.
- Errores: 400 `SOLICITUD_INVALIDA` (fechas mal formadas o `desde` posterior a `hasta`), 401 `CONTEXTO_INVALIDO`, 403 `ACCESO_NO_AUTORIZADO`, 503 `SERVICIO_NO_DISPONIBLE`.
