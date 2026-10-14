# Property Service — notas para el frontend

Fuente de verdad de los contratos (rutas exactas, campos, tipos): `docs/openapi/property-service.json`.
Este archivo cubre solo lo que el JSON no dice: autenticación, permisos por rol, flujos de varios pasos y reglas de negocio.
Si algo de aquí contradice el JSON en rutas o campos, gana el JSON.

---

## 1. Cómo se llama el servicio

- Todas las llamadas van directamente al **subdominio de la API** (el Gateway), nunca al puerto del microservicio.
  Property Service queda expuesto bajo `/propiedades/**` (y las rutas de imágenes sueltas, ver sección 3).
- Rutas privadas: header `Authorization: Bearer <accessToken>`.
- **No enviar `X-User-Id` ni `X-User-Role`.** El Gateway los borra si vienen del cliente y los pone él a partir del token.
- Ruta privada sin token, o con token inválido o vencido: el Gateway responde `401`.
- Rutas públicas (sin token obligatorio): todos los `GET /propiedades/**`.
  **Todo lo demás exige token**, incluidos `POST` y `PUT` sobre esas mismas rutas.
- **Aunque el `GET` sea público, si el usuario tiene sesión conviene mandar el token igual** (en el detalle, ver 4.2).
  En rutas públicas un token válido se respeta; uno inválido simplemente se trata como anónimo.
- El rol y el id salen del token. Ocultar botones según el rol es solo UX: el backend vuelve a validar y responde `403`.

## 2. Roles y quién puede qué

Roles: `ADMINISTRADOR_CENTRAL`, `GERENTE_OFICINA`, `AGENTE`, `CLIENTE`.

- **Ver** catálogo y detalle: cualquiera, incluso sin sesión.
- **Crear** propiedad: `AGENTE`, `GERENTE_OFICINA`, `ADMINISTRADOR_CENTRAL`. `CLIENTE` recibe `403`.
- **Editar, cambiar estado y gestionar imágenes**: solo el **agente dueño** de la propiedad, o `ADMINISTRADOR_CENTRAL` como respaldo.
  Un `GERENTE_OFICINA` o un `AGENTE` que no sea el dueño reciben `403`. `CLIENTE` siempre `403`.
- El dueño es `propiedad.agenteId`, que es el **id del usuario** (no el id del registro de agente).
  Para mostrar "editar" en una propiedad: `propiedad.agenteId === usuarioActual.id || rol === 'ADMINISTRADOR_CENTRAL'`.
- El `agenteId` nunca se manda en el body al crear: el backend lo toma del token.

## 3. Endpoints

| Método | Ruta | Token | Quién puede | Notas |
|---|---|---|---|---|
| POST | `/propiedades` | Sí | Roles internos (ver 2) | Nace siempre `DISPONIBLE`. Responde `201` con la propiedad creada. |
| GET | `/propiedades` | No | Público | Listado liviano, paginado, con filtros opcionales (ver 4.1). |
| GET | `/propiedades/{id}` | Opcional | Público | Detalle completo con todas las imágenes. Puede registrar una "vista" (ver 4.2). |
| PUT | `/propiedades/{id}` | Sí | Dueño o admin | Actualización parcial: solo cambian los campos que vengan con valor. |
| PUT | `/propiedades/{id}/estado` | Sí | Dueño o admin | Body: `{ "nuevoEstado": "..." }`. |
| POST | `/propiedades/{id}/imagenes/upload-urls` | Sí | Dueño o admin | Body: `{ "nombresArchivo": [..] }`. Devuelve una URL de subida por archivo. |
| POST | `/propiedades/{id}/imagenes/confirmar` | Sí | Dueño o admin | Body: arreglo de `{ key, esPortada }`. |
| PUT | `/imagenes/{imagenId}/portada` | Sí | Dueño o admin | Marca esa imagen como portada. Sin body. |
| DELETE | `/imagenes/{imagenId}` | Sí | Dueño o admin | Borra la imagen (también del almacenamiento). |

Las dos últimas rutas empiezan por `/imagenes`, no por `/propiedades`. Confirmar en el JSON que el Gateway las enruta a este servicio.

## 4. Reglas y flujos que el JSON no muestra

### 4.1 Listado vs. detalle

- `GET /propiedades` devuelve una **versión liviana**: `id`, `titulo`, `precio`, `ciudad`, `tipoPropiedad`, `modalidad`, `estadoComercial`, `urlPortada`. No trae descripción, agente, características ni todas las fotos. Es para las tarjetas del catálogo.
- `GET /propiedades/{id}` trae **todo**: descripción, dirección, `caracteristicas`, `agenteId`, `nombreAgente`, la lista completa de `imagenes` (`id`, `url`, `orden`, `esPortada`, ya ordenadas) y fechas.
- Filtros del listado (todos opcionales y combinables): `tipoPropiedad`, `modalidad`, `estadoComercial`, `ciudad`, `precioMin`, `precioMax`, más los parámetros de paginación. Confirmar nombres exactos y forma de la página en el JSON.
- `urlPortada` puede ser `null` (propiedad sin fotos, o a la que se le borró la portada). Mostrar un placeholder.
- Las `url` de imágenes ya vienen completas (dominio público + key). Se usan directo en `<img src>`. No existe ni se debe construir el `key` en el frontend.

### 4.2 Vistas (contador "más vistas")

- Cada `GET /propiedades/{id}` puede generar un evento de vista que alimenta el home ("más vistas").
- No cuenta si quien consulta es el agente dueño. Para eso el backend necesita saber quién es: **mandar el token cuando hay sesión**.
- Una misma persona (o la misma IP, si es anónima) cuenta una sola vez cada 30 minutos. Recargar la página no infla el contador.
- No hay nada que hacer en el frontend aparte de mandar el token cuando exista.

### 4.3 Valores válidos

- `tipoPropiedad`: `CASA`, `APARTAMENTO`. No hay otros.
- `modalidad`: `VENTA`, `ALQUILER`. Cada propiedad tiene una sola; no puede ser ambas.
- `estadoComercial`: `DISPONIBLE`, `RESERVADO`, `VENDIDO`, `ALQUILADO`.
- `modalidad` y `tipoPropiedad` **no se pueden editar** después de crear (solo se fijan en el `POST`). `estadoComercial` solo cambia por `PUT /propiedades/{id}/estado`, nunca por el `PUT` general.
- El cambio de estado es libre: se puede volver de `VENDIDO` a `DISPONIBLE`. El backend no distingue una corrección de error de una venta caída.
- Más adelante el estado también podrá cambiar solo, cuando un contrato se cancele. El frontend no debe asumir que el estado que cargó sigue vigente.

### 4.4 `caracteristicas` (JSON libre)

- Es un objeto libre (por ejemplo `habitaciones`, `banos`, `area_m2`) porque cada tipo de propiedad tiene atributos distintos.
- **El backend no lo valida.** El formulario del frontend es quien decide qué campos van según `tipoPropiedad` y quien debe validarlos. Lo que se guarde, se devuelve tal cual.
- Al editar, si se manda `caracteristicas`, **reemplaza el objeto completo**. Hay que mandar todos los campos, no solo el que cambió.

### 4.5 Ubicación y mapa (MapLibre)

- La propiedad lleva `latitud` y `longitud` (números). El backend solo las guarda: no geocodifica direcciones ni consulta ningún proveedor de mapas.
- Con MapLibre GL JS el flujo es: el agente hace clic o arrastra un marcador, el mapa entrega `lng`/`lat`, y se envían como dos números en el body. **Ojo con el orden:** MapLibre y GeoJSON usan `[lng, lat]`; el body del API usa campos con nombre (`latitud`, `longitud`), no un arreglo.
- Rangos válidos: latitud entre -90 y 90, longitud entre -180 y 180. Validar en el cliente antes de enviar.
- Para la búsqueda de dirección (opcional) hace falta un geocodificador gratuito del lado del frontend; el backend no participa.
- Estas coordenadas se usan para asignar los leads a la oficina más cercana, así que un pin mal puesto afecta a quién le llega el lead. Conviene mostrar el marcador sobre el mapa para que el agente confirme.
- Las oficinas también traen coordenadas (en User Service), de modo que se pueden pintar propiedades y oficinas en el mismo mapa.
- Confirmar en el JSON que `latitud`/`longitud` estén en el body de crear, en el de editar y en las respuestas. El listado liviano **no** las trae a propósito: para una vista de "mapa con todas las propiedades" habría que añadirlas ahí.

### 4.6 Subida de imágenes (3 pasos, por lote)

Las fotos **no pasan por el backend**: se suben directo al almacenamiento (Cloudflare R2) con URLs firmadas que caducan en pocos minutos.

1. **Pedir URLs.** `POST /propiedades/{id}/imagenes/upload-urls` con `{ "nombresArchivo": ["a.jpg", "b.png"] }`.
   Responde una lista, en el mismo orden, con `uploadUrl` y `key` por archivo.
   Solo se aceptan `.jpg`/`.jpeg`, `.png` y `.webp`. Otra extensión da error.
2. **Subir cada archivo.** `PUT` a `uploadUrl` con el archivo como body.
   **El header `Content-Type` debe ser exactamente el tipo del archivo** (`file.type` en el navegador). Si no coincide con el que se firmó, R2 rechaza la subida (`403`).
   Este `PUT` va directo a R2: **sin** `Authorization`. Subir en paralelo está bien.
3. **Confirmar.** `POST /propiedades/{id}/imagenes/confirmar` con un arreglo de `{ "key": "...", "esPortada": true|false }`, usando los `key` del paso 1.
   - **El orden de las fotos es el orden del arreglo.** No se manda número de orden; el backend usa la posición (0, 1, 2…).
   - Máximo **una** `esPortada: true` por lote; más de una da error.
   - Si ninguna viene como portada, la portada actual no cambia. Una propiedad nueva puede quedar sin portada si el frontend no marca ninguna: por eso se recomienda marcar la primera.
   - Si se sube un lote nuevo con una portada, la portada anterior se desmarca sola.

Si el paso 2 falla o el usuario se arrepiente, simplemente no se llama al paso 3. El archivo suelto queda en el bucket sin registrarse (limpieza pendiente en backend). No hay que hacer nada especial en el frontend.

### 4.7 Portada, borrado y reordenar

- Cambiar la portada: `PUT /imagenes/{imagenId}/portada`. El backend desmarca la anterior y marca la nueva a la vez.
- Si se borra la imagen que era portada, la propiedad **queda sin portada**; no se reasigna sola. Mostrar placeholder hasta que se elija otra.
- **Reordenar fotos ya subidas todavía no tiene endpoint.** Si hace falta drag-and-drop, hay que avisar al backend (la idea es un `PUT` que reciba los ids en el orden deseado).

### 4.8 Formularios de edición: precargar y enviar solo lo que cambió

Aplica a `PUT /propiedades/{id}`. El request acepta campos nulos o ausentes y los ignora, así que:

- Al abrir el formulario, **cada campo se precarga con el valor actual** (sale de `GET /propiedades/{id}`), para que la persona vea qué tenía.
- Al guardar, **enviar solo los campos cuyo valor cambió** respecto al original. Los que no cambiaron no se mandan (o van como `null`) y el backend no los toca.
- Si no cambió ningún campo, no llamar al endpoint.
- `caracteristicas` es una excepción: si cambia aunque sea un atributo, se envía el **objeto completo** (el backend lo reemplaza entero, ver 4.4).
- Como `null` significa "no cambiar", **no se puede borrar un campo** mandándolo vacío. Un campo de texto que la persona deje en blanco no debe enviarse como `""`.
- `tipoPropiedad`, `modalidad` y `estadoComercial` no van en este formulario (ver 4.3).

## 5. Errores

| Código | Cuándo |
|---|---|
| `400` | Falla la validación del body, o extensión de imagen no soportada, o más de una portada en el lote. |
| `401` | Ruta privada sin token, o con token inválido o vencido (lo responde el Gateway). |
| `403` | Rol `CLIENTE` intentando crear/editar, o un usuario que no es el dueño ni admin. |
| `404` | Propiedad o imagen inexistente. |
| `409` | Conflictos de reglas, si el backend los aplica (por ejemplo, portada duplicada según cómo esté mapeada la excepción). |

La forma exacta del cuerpo del error depende del handler global. Revisarla en una respuesta real antes de armar el manejo de errores. Los códigos exactos de `400` vs `409` en portada duplicada y extensión inválida hay que confirmarlos en el JSON o probando.

## 6. Pantallas sugeridas y sus endpoints

**Público (sin sesión)**
- Catálogo con filtros y paginación: `GET /propiedades`.
- Detalle con carrusel de fotos, características y mapa: `GET /propiedades/{id}`. Mandar el token si hay sesión.
- Más adelante, "más vistas" y "más gustadas" del home vendrán de Analytics Service, no de este.

**Cliente con sesión**
- Solo lectura. El botón "Me interesa" crea un lead (Lead Service, no este servicio) y solo debe mostrarse si `estadoComercial === 'DISPONIBLE'`.

**Agente (y gerente/admin)**
- Formulario "Publicar propiedad" con campos dinámicos de `caracteristicas` según el tipo, y mapa para elegir la ubicación.
- Después de crear, pantalla de fotos: seleccionar varias, subir (4.6), elegir portada.
- Editar propiedad, cambiar estado, gestionar fotos: mostrar solo si es el dueño o admin.
- Listado "mis propiedades": **no existe un endpoint propio.** Se puede filtrar en el cliente por `agenteId` solo con el detalle (el listado liviano no trae `agenteId`). Si se necesita, pedirlo al backend.

## 7. Limitaciones conocidas

- No hay endpoint de "mis propiedades" ni filtro por agente en el listado.
- No hay endpoint para reordenar fotos ya subidas.
- El listado no trae coordenadas.
- No hay borrado de propiedades: para retirarla del catálogo se usa el estado.
- `caracteristicas` no se valida en backend.
