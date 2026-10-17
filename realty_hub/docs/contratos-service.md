# Diseño del frontend: Contratos

Este documento describe cómo debe ser la interfaz de **Contratos**. Complementa el contexto del microservicio y los `.json` de OpenAPI de la carpeta de endpoints en `docs`. Si algo de aquí contradice los `.json`, mandan los `.json` para los contratos de la API, y este documento manda para la experiencia de usuario.

## Qué es un contrato

Los contratos **no se crean desde el frontend**. Cuando el agente pasa un lead a `OFERTA_ACEPTADA`, el backend genera solo un contrato en estado `BORRADOR`, con el precio de la propiedad como precio inicial. El agente lo revisa, ajusta el precio, lo firma, y el cliente puede ver y descargar el PDF.

```
BORRADOR ──firmar──▶ FIRMADO ──cancelar──▶ CANCELADO
   └────────────────cancelar──────────────────▲
```

| Estado | Qué se puede hacer |
|---|---|
| `BORRADOR` | Editar el precio, ver la vista previa en PDF, firmar, cancelar. |
| `FIRMADO` | Descargar el PDF firmado, cancelar. Ya no se edita. |
| `CANCELADO` | Solo consulta. Estado final. |

Tipos: `COMPRAVENTA` y `ALQUILER`. `ARRAS` existe en el modelo, pero hoy no se genera automáticamente.

Al firmar, el backend marca la propiedad como `VENDIDO` o `ALQUILADO` y cancela las visitas pendientes de esa propiedad. Al cancelar un contrato que estaba firmado, la propiedad vuelve a `DISPONIBLE`.

## Roles y qué ve cada uno

| Acción | `AGENTE` (del contrato) | `CLIENTE` (del contrato) | `ADMINISTRADOR_CENTRAL` |
|---|---|---|---|
| Listar mis contratos | Sí | Sí | No (403) |
| Ver detalle | Sí | Sí | Sí |
| Editar precio | Sí | No | Sí |
| Firmar | Sí | No | Sí |
| Cancelar | Sí | No | Sí |
| Vista previa y documento | Sí | Sí | Sí |

`GERENTE_OFICINA` recibe 403 en estos endpoints. No le muestres la sección de contratos.

Muestra u oculta botones según el rol y el estado. La seguridad real la hace el backend, pero un botón que va a devolver 403 es mala experiencia.

## Pantallas

### 1. Lista de contratos (agente y cliente)

- Datos de `GET /contratos/mis-contratos`, con `estado` como filtro opcional. Vienen ordenados del más reciente al más antiguo.
- Cada tarjeta muestra el tipo (`COMPRAVENTA` o `ALQUILER`), el estado como chip, el precio acordado con formato de pesos colombianos (COP) y la fecha de creación.
- La lista no trae la dirección ni el nombre de la contraparte. Esos datos están en el detalle, así que no los muestres en la lista, o muéstralos cargándolos por separado si lo consideras importante.
- Los borradores van destacados para el agente, porque son los que requieren acción: un indicador "Pendiente de firma".
- Vacío: "Aún no tienes contratos. Se generan cuando un cliente acepta una oferta."
- Si acabas de mover un lead a `OFERTA_ACEPTADA` y el borrador aún no aparece, es normal: se genera de forma asíncrona. Ofrece un botón "Actualizar" o reintenta una vez tras unos segundos.

### 2. Detalle del contrato

Datos de `GET /contratos/{id}`:
- Encabezado: tipo, estado, precio acordado, fecha de creación y, si está firmado, `firmadoEn`.
- Partes: `nombreCliente`, `nombreAgente`, `direccionPropiedad`, `ciudadPropiedad`. Estos datos quedan congelados al crear el borrador y no cambian después.
- `contenido`: el texto completo del contrato. Muéstralo en un contenedor legible, respetando los saltos de línea (`white-space: pre-wrap`). El texto se regenera cada vez que cambia el precio.
- Enlaces a la propiedad (`propiedadId`) y al lead (`leadId`).

Botones según estado y rol:
- `BORRADOR`, agente o administrador: "Editar precio", "Ver vista previa", "Firmar", "Cancelar".
- `BORRADOR`, cliente: "Ver vista previa".
- `FIRMADO`, agente o administrador: "Descargar PDF", "Cancelar".
- `FIRMADO`, cliente: "Descargar PDF".
- `CANCELADO`: ningún botón.

### 3. Editar precio (solo `BORRADOR`)

- Un campo numérico de precio, con formato de pesos colombianos al mostrarlo. Envía solo el número, sin símbolos ni separadores.
- Debe ser mayor que 0. Valídalo en el cliente antes de enviar.
- `PUT /contratos/{id}` con `{ "precioAcordado": 450000000 }`. Responde `200` con el contrato actualizado.
- Después de guardar, vuelve a cargar `contenido`, porque el texto se regenera con el precio nuevo.

### 4. Vista previa del borrador (PDF)

- Solo para `BORRADOR`. Es un PDF con la marca "BORRADOR - SIN VALOR LEGAL" que no se guarda.
- La ruta exige el token, así que no sirve ponerla directo en un `<iframe src>`, un `<embed>` ni un `<a href>`. Descarga el PDF con `fetch` y el header `Authorization`, conviértelo en blob y muéstralo con `URL.createObjectURL`. Libera la URL con `URL.revokeObjectURL` al cerrar el visor.
- Muéstralo en un modal o en una pestaña nueva, con un botón de descarga.
- Si responde `DOCUMENTO_NO_DISPONIBLE`, el contrato ya no es un borrador: recarga el detalle.

### 5. Firmar (solo `BORRADOR`)

- Exige que el precio esté definido. Si no lo está, el backend responde `PRECIO_REQUERIDO`.
- Muestra siempre una confirmación antes de enviar, con el resumen: partes, propiedad y precio. Texto sugerido: "Al firmar se genera el PDF definitivo y la propiedad pasará a vendida o alquilada. Esta acción no se puede deshacer, aunque el contrato puede cancelarse después."
- `PATCH /contratos/{id}/firmar`, sin body. Responde `200` con `estado: "FIRMADO"` y `firmadoEn`.
- Deshabilita el botón mientras la petición está en curso. Firmar genera un PDF y lo sube a almacenamiento, así que puede tardar unos segundos: muestra un indicador de progreso.
- Si falla con `PDF_NO_GENERADO` o `ALMACENAMIENTO_NO_DISPONIBLE`, el contrato sigue en borrador. Permite reintentar.
- Tras firmar, actualiza el detalle y ofrece "Descargar PDF".

### 6. Cancelar

- Disponible desde `BORRADOR` o `FIRMADO`.
- Confirmación obligatoria. Si el contrato está firmado, avisa de forma explícita: "La propiedad volverá a estar disponible."
- `PATCH /contratos/{id}/cancelar`, sin body. Responde `200` con `estado: "CANCELADO"`.

### 7. Descargar el PDF firmado

- Solo para `FIRMADO`. `GET /contratos/{id}/documento` devuelve:

```json
{
  "url": "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "version": 1,
  "hashSha256": "9f2c...",
  "expiraEn": "2026-10-20T10:10:00"
}
```

- La `url` caduca en unos 10 minutos. Pídela cada vez que el usuario haga clic en "Descargar" y úsala de inmediato. No la guardes en el estado ni en el almacenamiento local.
- Ábrela con `window.open(url)` o un enlace, **sin** el header `Authorization`. La URL ya lleva la firma, y mandar el token puede hacer que falle.
- `hashSha256` se puede mostrar en un detalle técnico ("Huella del documento") para quien quiera verificar la integridad.

## Cómo conectar con Leads

- Desde el detalle de un lead en `OFERTA_ACEPTADA`, ofrece un botón "Ver contrato".
- No existe un endpoint para buscar un contrato por lead. Para encontrarlo, carga `mis-contratos` y busca el que tenga el `leadId` correspondiente. Si no aparece, muestra "El contrato se está generando".
- Al mover un lead a `OFERTA_ACEPTADA`, después de la confirmación lleva al agente a la lista de contratos.

## Mensajes de error

Decide qué mostrar por el campo `codigo`, nunca por el texto de `mensaje`.

| Código | Qué mostrar |
|---|---|
| `SOLICITUD_INVALIDA` (400) | Marca el campo del precio como inválido. |
| `CONTEXTO_INVALIDO` (401) | Renovar sesión o ir al login. |
| `ACCESO_NO_AUTORIZADO` (403) | "No tienes permiso sobre este contrato." |
| `CONTRATO_NO_ENCONTRADO` (404) | "El contrato no existe." |
| `CONTRATO_NO_EDITABLE` (409) | "Este contrato ya no se puede editar." Recarga el detalle. |
| `PRECIO_REQUERIDO` (409) | "Define el precio antes de firmar." |
| `TRANSICION_INVALIDA` (409) | "Este contrato ya cambió de estado." Recarga el detalle. |
| `DOCUMENTO_NO_DISPONIBLE` (409) | "El documento aún no está disponible." Recarga el detalle. |
| `PDF_NO_GENERADO` (500) | "No se pudo generar el PDF. Intenta de nuevo." con reintento. |
| `ALMACENAMIENTO_NO_DISPONIBLE` (502) | "No se pudo guardar el documento. Intenta de nuevo." con reintento. |
| `SERVICIO_NO_DISPONIBLE` (503) | "Un servicio no responde. Intenta de nuevo." con reintento. |

## Estados de la interfaz

Cada pantalla debe cubrir: cargando (esqueletos), vacío, error con reintento y éxito. Después de cualquier acción (editar, firmar, cancelar), actualiza la pantalla con la respuesta del servidor o vuelve a pedir el detalle; no cambies el estado solo de forma local. Si dos usuarios actúan sobre el mismo contrato, el segundo recibirá un 409; recarga y muestra el estado real.

## Formato

- Precios: pesos colombianos, sin decimales (`$450.000.000`). El valor llega como número.
- Fechas: llegan sin zona horaria, en hora de Colombia (`2026-10-16T09:30:00`). Muéstralas tal cual.

## Lo que no existe todavía

- La ruta `/contratos/**` debe existir en el Gateway. Si todas las llamadas dan 404, falta esa ruta, que es un tema del backend.
- No hay endpoint para buscar un contrato por lead; se resuelve filtrando `mis-contratos`.
- La lista de contratos no incluye la dirección ni el nombre de la contraparte; solo el detalle.
- No hay endpoint de perfil del agente: el nombre es solo texto hasta que exista.
