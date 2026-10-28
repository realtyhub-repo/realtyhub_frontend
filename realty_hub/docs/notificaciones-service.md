# Frontend de Notificaciones (RealtyHub)

Servicio: Notification Service (puerto 8088). Todas las rutas van por el Gateway bajo `/notificaciones` y requieren el JWT (`Authorization: Bearer ...`). El Gateway inyecta `X-User-Id` y `X-User-Role`; el front no los envía.

Cualquier rol autenticado (CLIENTE, AGENTE, GERENTE_OFICINA, ADMINISTRADOR_CENTRAL) ve solo SUS notificaciones.

## 1. Estrategia (polling, sin WebSocket)

1. Al iniciar sesión y cada 15–20 s (solo con la pestaña visible), llamar `GET /notificaciones/no-leidas/contador`.
2. Mostrar el número en la campana (badge). Ocultar el badge si es 0.
3. Si el contador subió respecto al anterior, o el usuario abre el panel, llamar `GET /notificaciones`.
4. Pausar el polling cuando `document.hidden` y hacer una consulta inmediata al volver a la pestaña.
5. Si el contador responde 401, el token expiró: seguir el flujo normal de refresh/login.

## 2. Endpoints

### GET /notificaciones/no-leidas/contador
Respuesta 200:
```json
{ "noLeidas": 3 }
```

### GET /notificaciones
Query params (todos opcionales):
- `soloNoLeidas` (boolean, default `false`)
- `pagina` (default `0`)
- `tamanio` (default `20`, máximo `100`)

Respuesta 200 (ordenadas de más nueva a más antigua):
```json
{
  "contenido": [
    {
      "id": "uuid",
      "tipo": "VISITA_AGENDADA",
      "titulo": "Visita agendada",
      "mensaje": "Tu visita quedó agendada para el 20/10/2026 a las 10:00.",
      "referenciaId": "uuid",
      "leida": false,
      "leidaEn": null,
      "creadaEn": "2026-10-18T14:20:00.123"
    }
  ],
  "pagina": 0,
  "tamanio": 20,
  "totalElementos": 1,
  "totalPaginas": 1
}
```

### PATCH /notificaciones/{id}/leida
Marca una notificación como leída (idempotente). Devuelve la notificación actualizada (mismo formato del item). 404 si no existe o no es del usuario.

### PATCH /notificaciones/leer-todas
Sin body. Respuesta 200:
```json
{ "marcadas": 5 }
```

## 3. Errores

Formato único:
```json
{ "codigo": "NOTIFICACION_NO_ENCONTRADA", "mensaje": "...", "status": 404, "timestamp": "2026-10-18T14:20:00" }
```

| status | codigo | cuándo |
|---|---|---|
| 401 | CONTEXTO_INVALIDO | faltan/son inválidos los headers del Gateway |
| 404 | NOTIFICACION_NO_ENCONTRADA | id inexistente o de otro usuario |
| 400 | SOLICITUD_INVALIDA | parámetros con formato inválido |

## 4. Tipos de notificación (`tipo`)

| tipo | Quién la recibe | Sugerencia de ícono / destino |
|---|---|---|
| VISITA_AGENDADA | cliente y agente | calendario → detalle de visita (`referenciaId` = visitaId) |
| VISITA_CANCELADA | la otra parte (o ambos si fue sistema/admin) | calendario tachado → visita |
| RECORDATORIO_VISITA_24H | cliente y agente | reloj → visita |
| RECORDATORIO_VISITA_1H | cliente y agente | reloj (urgente) → visita |
| OFERTA_ACEPTADA | cliente | check → lead (`referenciaId` = leadId) |
| CONTRATO_FIRMADO | cliente y agente | documento → contrato (`referenciaId` = contratoId) |
| CONTRATO_CANCELADO | cliente y agente | documento tachado → contrato |
| COMISION_CREADA | gerente de la oficina | moneda → comisión (`referenciaId` = comisionId) |
| COMISION_APROBADA | agente | moneda/check → comisión |
| COMISION_PAGADA | agente | moneda/verde → comisión |
| COMISION_ANULADA | agente y gerente | moneda/rojo → comisión |
| COMISION_REVERTIDA | agente y gerente | moneda/ámbar → comisión |

`referenciaId` sirve para navegar al detalle al hacer clic. Cada tipo apunta a una entidad distinta (ver tabla); conviene un mapa `tipo -> ruta` en el front.

## 5. UI sugerida

- **Campana en el header** con badge del contador.
- **Dropdown/panel** con las últimas 10–20 (`tamanio=20`), con punto o fondo resaltado para las no leídas, título en negrita, mensaje y fecha relativa ("hace 5 min").
- **Clic en una notificación:** llamar `PATCH /{id}/leida` (actualizar el contador localmente restando 1) y navegar a la ruta según `tipo` + `referenciaId`.
- **Botón "Marcar todas como leídas"** → `PATCH /leer-todas`, luego poner el contador en 0.
- **Página "Todas las notificaciones"** con paginación y filtro "Solo no leídas" (`soloNoLeidas=true`).
- Estado vacío: "No tienes notificaciones".

## 6. Detalles a tener en cuenta

- `creadaEn` y `leidaEn` vienen como `LocalDateTime` ISO **sin zona** (hora del servidor). Parsearlos como hora local; no aplicar conversión UTC.
- Los mensajes ya vienen redactados en español; el front solo los muestra (no reconstruirlos desde el tipo).
- Las notificaciones también llegan por correo cuando corresponde (ofertas, visitas, contratos, comisiones pagadas, etc.). El inbox es la fuente completa; el correo es solo un aviso extra y el front no interviene.
- Los recordatorios de visita se generan a las 24 h y a 1 h antes; pueden aparecer con retraso de hasta ~1 minuto.
- Con el polling no hace falta guardar estado global complejo: basta un hook/servicio que consulte el contador y exponga `{ noLeidas, refrescar }`.
