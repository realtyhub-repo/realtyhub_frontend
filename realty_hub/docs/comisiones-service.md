# Diseño del frontend: Comisiones

Este documento describe cómo debe ser la interfaz de **Comisiones**. Complementa el contexto del microservicio y los `.json` de OpenAPI de la carpeta de endpoints en `docs`. Si algo de aquí contradice los `.json`, mandan los `.json` para los contratos de la API, y este documento manda para la experiencia de usuario.

## Qué es una comisión

Las comisiones **no se crean desde el frontend**. Cuando un contrato se firma, el backend calcula solo la comisión de esa operación y la deja en estado `PENDIENTE`. Después alguien la aprueba, y por último el administrador registra el pago.

Cada comisión se reparte entre tres beneficiarios:

| Beneficiario | Quién es |
|---|---|
| `AGENTE` | El agente del contrato. |
| `OFICINA` | La oficina a la que pertenece ese agente. |
| `CENTRAL` | La oficina central de esa oficina. Si la oficina del agente es la central, la misma entidad aparece en las dos líneas (`OFICINA` y `CENTRAL`). |

El monto total y los porcentajes salen de un **acuerdo comercial** vigente el día de la firma. Los valores quedan congelados en la comisión: si el acuerdo cambia después, las comisiones ya creadas no cambian.

```
PENDIENTE ──aprobar──▶ APROBADA ──pagar──▶ PAGADA ──revertir──▶ REVERTIDA
    └──── contrato cancelado ────▶ ANULADA ◀── contrato cancelado ──┘ (desde APROBADA)
```

| Estado | Significado | Qué se puede hacer |
|---|---|---|
| `PENDIENTE` | Recién calculada. | Aprobar. |
| `APROBADA` | Validada por un gerente o el administrador. | Pagar. |
| `PAGADA` | Pagada, con referencia de pago. | Revertir. |
| `ANULADA` | El contrato se canceló antes de pagar. Estado final. | Solo consulta. |
| `REVERTIDA` | Se pagó y luego se revirtió (por contrato cancelado o por decisión del administrador). Estado final. | Solo consulta. |

`ANULADA` y `REVERTIDA` los pone el sistema cuando se cancela un contrato firmado. El administrador también puede revertir manualmente una comisión `PAGADA`.

El pago es **por comisión completa**: al pagar, quedan pagadas las tres líneas a la vez. No hay pagos parciales por beneficiario.

## Roles y qué ve cada uno

| Acción | `AGENTE` | `GERENTE_OFICINA` | `ADMINISTRADOR_CENTRAL` | `CLIENTE` |
|---|---|---|---|---|
| Listar comisiones | Solo las suyas | Las de su oficina | Todas | No (403) |
| Ver detalle | Solo las suyas | Las de su oficina | Todas | No (403) |
| Ver el reparto completo | No, solo su línea `AGENTE` | Sí | Sí | No |
| Resumen | Su participación | Participación de su oficina | Montos totales | No (403) |
| Aprobar | No | Sí, las de su oficina | Sí | No |
| Pagar | No | No | Sí | No |
| Revertir | No | No | Sí | No |
| Ver acuerdos comerciales | No | Sí (solo lectura) | Sí | No |
| Crear o cerrar acuerdos | No | No | Sí | No |

Reglas adicionales:
- Nadie puede aprobar su **propia** comisión (si el usuario es el agente de esa comisión, el backend responde 403).
- Un gerente ve las comisiones de la oficina que dirigía cuando se firmó el contrato. Si la oficina cambia de gerente, el nuevo no ve las anteriores; el administrador sí.
- `CLIENTE` no debe ver la sección de comisiones en el menú.

Muestra u oculta botones según rol y estado. La seguridad real la hace el backend, pero un botón que va a devolver 403 es mala experiencia.

## Forma de los datos

### Comisión (lista y respuestas de acciones)

```json
{
  "id": "uuid",
  "contratoId": "uuid",
  "leadId": "uuid",
  "propiedadId": "uuid",
  "clienteId": "uuid",
  "agenteId": "uuid",
  "nombreAgente": "Juan Pérez",
  "oficinaId": "uuid",
  "nombreOficina": "Oficina Medellín",
  "tipoContrato": "COMPRAVENTA",
  "precioBase": 450000000.00,
  "montoTotal": 13500000.00,
  "estado": "PENDIENTE",
  "firmadoEn": "2026-10-16T09:30:00",
  "aprobadaEn": null,
  "pagadaEn": null,
  "referenciaPago": null,
  "createdAt": "2026-10-16T09:30:02",
  "reparto": [
    { "beneficiarioTipo": "AGENTE",  "beneficiarioId": "uuid", "beneficiarioNombre": "Juan Pérez",       "porcentaje": 50.00, "monto": 6750000.00 },
    { "beneficiarioTipo": "OFICINA", "beneficiarioId": "uuid", "beneficiarioNombre": "Oficina Medellín", "porcentaje": 30.00, "monto": 4050000.00 },
    { "beneficiarioTipo": "CENTRAL", "beneficiarioId": "uuid", "beneficiarioNombre": "Oficina Central",  "porcentaje": 20.00, "monto": 2700000.00 }
  ]
}
```

- `nombreAgente` y `nombreOficina` son los nombres guardados al crear la comisión; no cambian después. `nombreAgente` puede enlazar a `/agentes/:agenteId`.
- Para el rol `AGENTE`, `reparto` trae **solo** la línea `AGENTE`. No asumas que siempre hay tres líneas.
- Los montos son pesos enteros (aunque lleguen con `.00`). La suma de las líneas siempre es igual a `montoTotal`.
- `precioBase` es el precio acordado del contrato. En alquiler es el canon mensual.

### Detalle

`GET /comisiones/{id}` devuelve lo mismo y además:
`centralId`, `baseCalculo` (`PORCENTAJE_PRECIO` o `MESES_CANON`), `valorRegla`, `acuerdoId`, `aprobadaPor`, `pagadaPor` y un arreglo `historial`:

```json
"historial": [
  { "estadoAnterior": null,        "estadoNuevo": "PENDIENTE", "usuarioId": null,   "motivo": "Contrato firmado",          "createdAt": "2026-10-16T09:30:02" },
  { "estadoAnterior": "PENDIENTE", "estadoNuevo": "APROBADA",  "usuarioId": "uuid", "motivo": null,                        "createdAt": "2026-10-17T10:00:00" },
  { "estadoAnterior": "APROBADA",  "estadoNuevo": "PAGADA",    "usuarioId": "uuid", "motivo": "Referencia de pago: TR-1042", "createdAt": "2026-10-18T08:15:00" }
]
```

`usuarioId: null` significa que el cambio lo hizo el sistema (creación o cancelación de contrato).

### Lista paginada

```json
{
  "contenido": [ { "...comisión..." } ],
  "pagina": 0,
  "tamanio": 20,
  "totalElementos": 57,
  "totalPaginas": 3
}
```

La página empieza en 0. El orden es del más reciente al más antiguo según `firmadoEn`.

## Pantallas

### 1. Lista de comisiones (agente, gerente, administrador)

- Datos de `GET /comisiones` con los filtros opcionales `estado`, `desde`, `hasta` (formato `AAAA-MM-DD`), `pagina` (desde 0) y `tamanio` (por defecto 20, máximo 100).
- Cada fila o tarjeta muestra: tipo de contrato, nombre del agente, fecha de firma, estado como chip y monto. El monto principal depende del rol:
  - Agente: el `monto` de su línea `AGENTE` (es lo que él cobra).
  - Gerente: el `monto` de la línea `OFICINA` (lo de su oficina). Puede mostrar también el total.
  - Administrador: `montoTotal`.
- Filtros: selector de estado, rango de fechas y paginación. Valida que `desde` no sea posterior a `hasta` antes de enviar.
- Las `PENDIENTE` van destacadas para el gerente y el administrador, porque requieren acción. Las `APROBADA` lo mismo para el administrador (falta pagar).
- Vacío: "Aún no hay comisiones. Se generan cuando se firma un contrato."
- Si acabas de firmar un contrato y la comisión no aparece, es normal: se genera de forma asíncrona. Ofrece un botón "Actualizar".

### 2. Resumen (encabezado de la lista o tablero)

`GET /comisiones/resumen?desde=&hasta=`. Si no envías fechas, el rango es **desde el 1 de enero del año actual hasta hoy**.

```json
{
  "desde": "2026-01-01",
  "hasta": "2026-10-18",
  "perspectiva": "PARTICIPACION_AGENTE",
  "porEstado": [
    { "estado": "PENDIENTE", "cantidad": 2, "monto": 9000000.00 },
    { "estado": "APROBADA",  "cantidad": 1, "monto": 3000000.00 },
    { "estado": "PAGADA",    "cantidad": 4, "monto": 21000000.00 },
    { "estado": "ANULADA",   "cantidad": 0, "monto": 0 },
    { "estado": "REVERTIDA", "cantidad": 0, "monto": 0 }
  ]
}
```

Siempre llegan los cinco estados, aunque estén en cero. El significado de `monto` depende de `perspectiva`:

| `perspectiva` | Quién la recibe | Qué suma `monto` |
|---|---|---|
| `PARTICIPACION_AGENTE` | Agente | Lo que le corresponde al agente. |
| `PARTICIPACION_OFICINA` | Gerente | Lo que le corresponde a su oficina. |
| `MONTO_TOTAL` | Administrador | El monto total de las comisiones. |

Rotula las tarjetas según la perspectiva, para que nadie confunda "lo mío" con "el total". Sugerencia: "Por cobrar" = `PENDIENTE` + `APROBADA`, "Cobrado" = `PAGADA`.

### 3. Detalle de la comisión

Datos de `GET /comisiones/{id}`.
- Encabezado: tipo de contrato, estado, `montoTotal`, fecha de firma.
- Cómo se calculó: `precioBase` y la regla aplicada. Si `baseCalculo` es `PORCENTAJE_PRECIO`, texto tipo "3 % del precio acordado". Si es `MESES_CANON`, "1 mes de canon". `valorRegla` trae el número.
- Tabla del reparto: beneficiario, porcentaje y monto (una fila por línea que llegue).
- Historial como línea de tiempo, con fecha, estado nuevo y motivo.
- Enlaces al contrato (`contratoId`), la propiedad (`propiedadId`) y el agente (`agenteId`).
- Si está `PAGADA`: mostrar `referenciaPago`, `pagadaEn` y quién pagó.

Botones según estado y rol:
- `PENDIENTE`, gerente (de esa oficina) o administrador: "Aprobar".
- `APROBADA`, administrador: "Registrar pago".
- `PAGADA`, administrador: "Revertir".
- `ANULADA`, `REVERTIDA` o cualquier otro caso: ningún botón.

### 4. Aprobar

- Confirmación breve: "¿Aprobar la comisión de [agente] por [monto]?"
- `PATCH /comisiones/{id}/aprobar`, sin body. Responde `200` con la comisión actualizada.
- Deshabilita el botón mientras la petición está en curso.

### 5. Registrar pago (solo administrador)

- Formulario con un campo obligatorio: **referencia de pago** (por ejemplo el número de la transferencia), máximo 120 caracteres.
- Confirmación que avise: "Se marcarán como pagadas todas las líneas del reparto."
- `PATCH /comisiones/{id}/pagar` con `{ "referenciaPago": "TR-1042" }`. Responde `200` con la comisión actualizada.

### 6. Revertir (solo administrador)

- Disponible solo en `PAGADA`. Formulario con **motivo** obligatorio, máximo 500 caracteres.
- Confirmación: "La comisión quedará revertida. Esta acción no se puede deshacer."
- `PATCH /comisiones/{id}/revertir` con `{ "motivo": "Pago duplicado" }`. Responde `200` con la comisión actualizada.

### 7. Acuerdos comerciales (administrador; el gerente solo ve)

Son las reglas que usa el sistema para calcular. Una pantalla de lista y una de detalle.

**Lista** (`GET /comisiones/acuerdos`, del más reciente al más antiguo): nombre, vigencia (`vigenteDesde` a `vigenteHasta`, o "Sin fecha de fin" si es `null`) y una marca "Vigente" si hoy cae dentro del rango.

**Detalle** (`GET /comisiones/acuerdos/{id}`): una tarjeta por regla con tipo de contrato, cómo se calcula el total y el reparto agente / oficina / central.

```json
{
  "id": "uuid",
  "nombre": "Acuerdo 2026",
  "vigenteDesde": "2026-01-01",
  "vigenteHasta": null,
  "creadoPor": "uuid",
  "createdAt": "2026-10-18T11:09:30",
  "reglas": [
    { "id": "uuid", "tipoContrato": "COMPRAVENTA", "baseCalculo": "PORCENTAJE_PRECIO", "valor": 3.0000,
      "porcentajeAgente": 50.00, "porcentajeOficina": 30.00, "porcentajeCentral": 20.00 },
    { "id": "uuid", "tipoContrato": "ALQUILER", "baseCalculo": "MESES_CANON", "valor": 1.0000,
      "porcentajeAgente": 50.00, "porcentajeOficina": 30.00, "porcentajeCentral": 20.00 }
  ]
}
```

**Crear acuerdo** (`POST /comisiones/acuerdos`, `201`):

```json
{
  "nombre": "Acuerdo 2026",
  "vigenteDesde": "2026-01-01",
  "vigenteHasta": null,
  "reglas": [
    { "tipoContrato": "COMPRAVENTA", "baseCalculo": "PORCENTAJE_PRECIO", "valor": 3,
      "porcentajeAgente": 50, "porcentajeOficina": 30, "porcentajeCentral": 20 },
    { "tipoContrato": "ALQUILER", "baseCalculo": "MESES_CANON", "valor": 1,
      "porcentajeAgente": 50, "porcentajeOficina": 30, "porcentajeCentral": 20 }
  ]
}
```

Validaciones que conviene hacer en el formulario antes de enviar:
- `nombre` obligatorio, máximo 120 caracteres. `vigenteDesde` obligatorio. `vigenteHasta` opcional, y no puede ser anterior a `vigenteDesde`.
- Deben estar las reglas de `COMPRAVENTA` y `ALQUILER`. `ARRAS` es opcional. No repetir tipo.
- En cada regla, los tres porcentajes deben **sumar exactamente 100**. Muestra la suma en vivo y deshabilita "Guardar" si no es 100.
- `baseCalculo`: `PORCENTAJE_PRECIO` (valor entre 0 y 100, es un porcentaje del precio) o `MESES_CANON` (cantidad de meses de canon, **solo** para `ALQUILER`).
- Los acuerdos **no se editan** después de creados. Para cambiar porcentajes, se cierra el actual y se crea uno nuevo. Dilo en la interfaz.
- Dos acuerdos no pueden tener vigencias que se crucen. Si ya hay uno sin fecha de fin, hay que cerrarlo antes de crear el siguiente. Un buen flujo es: "Crear nuevo acuerdo" → si hay uno abierto, ofrecer cerrarlo primero con el día anterior a `vigenteDesde` del nuevo.

**Cerrar acuerdo** (`PATCH /comisiones/acuerdos/{id}/cerrar`, `200`) con `{ "vigenteHasta": "2026-12-31" }`. Solo se puede **acortar** la vigencia, nunca ampliarla, y la fecha no puede ser anterior a `vigenteDesde`.

Advertencia importante para el administrador: si se firma un contrato en una fecha sin acuerdo vigente, la comisión **no se crea** hasta que se corrija y se reprocese el evento. Muestra un aviso en la lista de acuerdos si hoy no hay ninguno vigente: "No hay acuerdo comercial vigente. Los contratos que se firmen hoy no generarán comisión."

## Cómo conectar con Contratos

- Desde el detalle de un contrato `FIRMADO`, para agente, gerente o administrador, se puede ofrecer "Ver comisión" que lleve a la lista de comisiones.
- No existe un endpoint para buscar la comisión de un contrato. La respuesta trae `contratoId`, así que para enlazar hay que cargar la lista y buscar. Si no aparece, muestra "La comisión se está generando".
- Si se cancela un contrato firmado, su comisión pasa sola a `ANULADA` (o a `REVERTIDA` si ya estaba pagada). Refresca la lista al volver a ella.

## Mensajes de error

Decide qué mostrar por el campo `codigo`, nunca por el texto de `mensaje`.

| Código | HTTP | Qué mostrar |
|---|---|---|
| `SOLICITUD_INVALIDA` | 400 | Marca el campo inválido o "Revisa los datos enviados." |
| `RANGO_FECHAS_INVALIDO` | 400 | "La fecha inicial no puede ser posterior a la final." |
| `ACUERDO_INVALIDO` | 400 | Muestra el `mensaje`: describe qué regla falla (reparto distinto de 100, falta una regla, fechas incoherentes, etc.). |
| `CONTEXTO_INVALIDO` | 401 | Renovar sesión o ir al login. |
| `ACCESO_NO_AUTORIZADO` | 403 | "No tienes permiso para esta acción." |
| `COMISION_NO_ENCONTRADA` | 404 | "La comisión no existe." |
| `ACUERDO_NO_ENCONTRADO` | 404 | "El acuerdo no existe." |
| `ACUERDO_SOLAPADO` | 409 | "La vigencia se cruza con otro acuerdo. Cierra el acuerdo vigente primero." |
| `TRANSICION_INVALIDA` | 409 | "Esta comisión ya cambió de estado." Recarga el detalle. |
| `CONFLICTO_CONCURRENTE` | 409 | "Otra persona acaba de modificar esta comisión." Recarga el detalle. |
| `SERVICIO_NO_DISPONIBLE` | 503 | "Un servicio no responde. Intenta de nuevo." con reintento. |

## Estados de la interfaz

Cada pantalla debe cubrir: cargando (esqueletos), vacío, error con reintento y éxito. Después de cualquier acción (aprobar, pagar, revertir, cerrar acuerdo), actualiza la pantalla con la respuesta del servidor o vuelve a pedir el detalle; no cambies el estado solo de forma local. Si dos personas actúan sobre la misma comisión, la segunda recibe un 409: recarga y muestra el estado real.

## Formato

- Montos: pesos colombianos, sin decimales (`$13.500.000`). El valor llega como número.
- Porcentajes: llegan con dos decimales (`50.00`); muéstralos como `50 %`.
- Fechas con hora (`firmadoEn`, `createdAt`, etc.): hora de Colombia, sin zona horaria (`2026-10-16T09:30:00`). Muéstralas tal cual.
- Fechas de vigencia de acuerdos y filtros `desde`/`hasta`: solo fecha, `AAAA-MM-DD`.

## Lo que no existe todavía

- La ruta `/comisiones/**` debe existir en el Gateway. Si todas las llamadas dan 404, falta esa ruta, que es un tema del backend.
- No hay endpoint para buscar la comisión de un contrato; se resuelve con la lista.
- No hay pagos parciales por beneficiario: el pago es de la comisión completa.
- No hay edición de acuerdos ni de reglas; solo crear y cerrar.
- No hay perfil público del agente garantizado: el nombre debe enlazar a `/agentes/:agenteId`, que puede ser una pantalla provisional.
