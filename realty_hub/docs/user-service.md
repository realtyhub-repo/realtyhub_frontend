# User Service — notas para el frontend

Fuente de verdad de los contratos (rutas exactas, campos, tipos): `docs/openapi/user-service.json`.
Este archivo cubre solo lo que el JSON no dice: autenticación, permisos por rol y reglas de negocio.
Si algo de aquí contradice el JSON en rutas o campos, gana el JSON.

---

## 1. Cómo se llama el servicio

- Todas las llamadas van directamente al **subdominio de la API** (el Gateway), nunca al puerto del microservicio.
  User Service queda expuesto bajo `/users/**`, `/oficinas/**` y `/agentes/**`.
- Rutas privadas: header `Authorization: Bearer <accessToken>` (el token que entrega Auth Service al hacer login).
- **No enviar `X-User-Id` ni `X-User-Role`.** El Gateway los borra si vienen del cliente y los pone él mismo a partir del token.
  (Antes de que existiera el Gateway se simulaban a mano; ya no se hace.)
- Ruta privada sin token, o con token inválido o vencido: el Gateway responde `401`.
- Rutas públicas (no necesitan token): `GET /oficinas/**` y `GET /agentes/{id}`.
  **Todo lo demás de User Service exige token.**
- El rol y el id del usuario salen del token, no de lo que mande el frontend. Ocultar botones según el rol es solo UX:
  el backend vuelve a validar y responde `403` si no corresponde.
- `/internal/**` no es para el frontend y el Gateway no lo expone. No usarlo.

## 2. Roles

`ADMINISTRADOR_CENTRAL`, `GERENTE_OFICINA`, `AGENTE`, `CLIENTE`.

- Los tres roles de personal tienen jerarquía plana: ningún gerente responde a otro gerente. Todos los gerentes responden solo al administrador central.
- La jerarquía de oficinas (central y sucursales) es estructural, no de autoridad. No implica mando entre gerentes.

## 3. Endpoints y permisos

### Usuarios (`/users`)

| Método | Ruta | Token | Quién puede | Notas |
|---|---|---|---|---|
| GET | `/users/me` | Sí | Cualquier usuario autenticado | Mi propio detalle completo. |
| PUT | `/users/me` | Sí | Cualquier usuario autenticado | Edita `nombre`, `telefono`, `urlFoto`. Actualización parcial: solo cambian los campos que vienen con valor. |
| GET | `/users` | Sí | `ADMINISTRADOR_CENTRAL` | Filtros opcionales y combinables: `rol`, `activo`. Responde una lista completa, sin paginación. |
| GET | `/users/{id}` | Sí | `ADMINISTRADOR_CENTRAL` | Detalle completo: email, teléfono, fecha de registro. |
| PUT | `/users/{id}/role` | Sí | `ADMINISTRADOR_CENTRAL` | No puede aplicarse a sí mismo (`409`). |
| PUT | `/users/{id}/status` | Sí | `ADMINISTRADOR_CENTRAL` | Activar o desactivar. No puede aplicarse a sí mismo (`409`). |

### Oficinas (`/oficinas`)

| Método | Ruta | Token | Quién puede | Notas |
|---|---|---|---|---|
| GET | `/oficinas` | No | Público | Directorio de oficinas. Incluye latitud y longitud para pintar el mapa. |
| GET | `/oficinas/{id}` | No | Público | |
| GET | `/oficinas/{id}/sucursales` | No | Público | Sucursales de una central. Confirmar la ruta exacta en el JSON. |
| GET | `/oficinas/{id}/agentes` | No | Público | Agentes de una oficina. |
| POST | `/oficinas` | Sí | `ADMINISTRADOR_CENTRAL` | Se crea siempre sin gerente. |
| PUT | `/oficinas/{id}` | Sí | `ADMINISTRADOR_CENTRAL` | Solo editables: nombre, región, latitud, longitud. **Tipo y oficina central no se pueden cambiar.** |
| PUT | `/oficinas/{id}/gerente` | Sí | `ADMINISTRADOR_CENTRAL` | Body: `usuarioId`. Asigna o reemplaza al gerente. |
| DELETE | `/oficinas/{id}/gerente` | Sí | `ADMINISTRADOR_CENTRAL` | Deja la oficina sin gerente. |

### Agentes (`/agentes`)

| Método | Ruta | Token | Quién puede | Notas |
|---|---|---|---|---|
| GET | `/agentes/{id}` | No | Público | |
| POST | `/agentes` | Sí | `ADMINISTRADOR_CENTRAL`, o `GERENTE_OFICINA` solo para su propia oficina | Body: `usuarioId`, `oficinaId`, `zonaEspecialidad` (opcional). |
| PUT | `/agentes/{id}` | Sí | Mismo criterio que crear | La oficina involucrada debe ser la del gerente. |

## 4. Reglas de negocio que el JSON no muestra

### 4.1 Convertir a alguien en agente toma pasos explícitos

Cambiar el rol de un usuario a `AGENTE` **no** lo vuelve agente automáticamente. El flujo es:

1. La persona se registra (queda como `CLIENTE`).
2. El administrador cambia su rol a `AGENTE` o `GERENTE_OFICINA` (`PUT /users/{id}/role`).
3. Se crea su registro de agente (`POST /agentes`) indicando su oficina.
4. Si es gerente, el administrador lo asigna a una oficina (`PUT /oficinas/{id}/gerente`).

Reglas del paso 3:
- Solo pueden ser agentes los usuarios con rol `AGENTE` o `GERENTE_OFICINA`. Un `ADMINISTRADOR_CENTRAL` no puede ser agente.
- Un usuario no puede tener dos registros de agente (`409`).
- La oficina debe existir (`404`).

### 4.2 Estructura de oficinas

- Cada oficina es de tipo `CENTRAL` o `SUCURSAL`.
- Una `SUCURSAL` debe indicar `oficinaCentralId`, y ese id debe ser de una oficina de tipo `CENTRAL`. Una `CENTRAL` no lleva `oficinaCentralId`.
- Solo hay dos niveles: central y sucursal. Una sucursal no puede ser padre de otra.
- Las centrales son independientes entre sí, no existe una "central de centrales".
- Una central puede tener sus propios agentes, además de sus sucursales.

### 4.3 Gerentes

- Una oficina tiene como máximo un gerente, y un gerente dirige como máximo una oficina.
- Una oficina puede estar sin gerente (recién creada, o después del `DELETE`).
- `PUT /oficinas/{id}/gerente` sobre una oficina que ya tenía gerente lo **reemplaza**.
- Solo se puede asignar a un usuario con rol `GERENTE_OFICINA` (`409` si no).
- Si el usuario ya dirige otra oficina, la asignación se rechaza (`409`). Primero hay que quitarlo de la anterior.
- `DELETE /oficinas/{id}/gerente` sobre una oficina sin gerente responde error (`409`).
- Un gerente solo puede crear o editar agentes de **su** oficina. Si no tiene oficina asignada, recibe `403`.

### 4.4 Ubicación

- Las oficinas (y las propiedades, en Property Service) llevan `latitud` y `longitud`.
- El frontend las obtiene con un mapa (MapLibre GL + tiles de OpenFreeMap, sin token): el usuario hace clic y el mapa entrega las coordenadas, que se envían como dos números. El backend no geocodifica direcciones.
- Esas coordenadas se usan para asignar leads al agente de la oficina más cercana a la propiedad, así que deben ser correctas.

### 4.5 Los ids de agente

- Un agente tiene dos ids: el `id` de su registro de agente y el `usuarioId` de su cuenta.
- `GET /agentes/{id}` y `PUT /agentes/{id}` reciben el `id` del registro de agente. La ficha pública (`/agentes/:id`) usa ese mismo id.
- **En el resto del sistema (propiedades, leads, visitas) `agenteId` siempre es el `usuarioId`**, no el `id` del registro de agente.
  Para comparar "¿esta propiedad es mía?" se compara contra el id del usuario autenticado.

### 4.6 Privacidad

- Email, teléfono y fecha de registro solo los ven el administrador central (en `/users/{id}` y `/users`) y el propio usuario (en `/users/me`).
- Las respuestas públicas de agentes solo traen nombre, oficina y zona de especialidad. `zonaEspecialidad` es informativa y opcional.

### 4.7 Formularios de edición: precargar y enviar solo lo que cambió

Aplica a `PUT /users/me`, `PUT /oficinas/{id}` y `PUT /agentes/{id}`. Los campos nulos o ausentes se ignoran, así que:

- Al abrir el formulario, **cada campo se precarga con el valor actual** (de `GET /users/me`, `GET /oficinas/{id}` o `GET /agentes/{id}`), para que la persona vea qué tenía.
- Al guardar, **enviar solo los campos cuyo valor cambió**. Los que no cambiaron no se mandan (o van como `null`) y el backend no los toca.
- Si no cambió ningún campo, no llamar al endpoint.
- Como `null` significa "no cambiar", **no se puede borrar un campo** mandándolo vacío. No enviar `""` para un campo que la persona dejó en blanco.
- En oficinas, `latitud` y `longitud` se consideran cambiadas solo si la persona movió el pin en el mapa.

## 5. Errores

| Código | Cuándo |
|---|---|
| `400` | Falla la validación del body (campo obligatorio vacío o con formato inválido). |
| `401` | Ruta privada sin token, o con token inválido o vencido (lo responde el Gateway). |
| `403` | Rol insuficiente, o un gerente actuando fuera de su oficina. |
| `404` | Usuario, oficina o agente inexistente. |
| `409` | Conflicto de reglas: autoeditarse el rol o estado, rol incorrecto para la operación, gerente ya asignado a otra oficina, oficina sin gerente al quitarlo, agente ya existente. |

La forma exacta del cuerpo del error depende del handler global del backend. Revisarla en una respuesta real antes de armar el manejo de errores.

## 6. Pantallas sugeridas y sus endpoints

**Público (sin sesión)**
- Directorio de oficinas con mapa: `GET /oficinas`, `GET /oficinas/{id}`, `GET /oficinas/{id}/sucursales`.
- Ficha de agente y lista de agentes de una oficina: `GET /agentes/{id}`, `GET /oficinas/{id}/agentes`.

**Cualquier usuario con sesión**
- Mi perfil: `GET /users/me`, `PUT /users/me`.

**Administrador central**
- Gestión de usuarios: listar con filtros, ver detalle, cambiar rol, activar o desactivar.
- Gestión de oficinas: crear y editar con mapa, asignar y quitar gerente.
- Gestión de agentes: crear y editar.

**Gerente de oficina**
- Ver y crear/editar agentes de su oficina.
- Un gerente **no** puede usar `GET /users` (`403`); para ver a su equipo usa `GET /oficinas/{id}/agentes`.

## 7. Limitaciones conocidas

- **No existe un endpoint "mi oficina" para el gerente.** Para saber qué oficina dirige, el frontend puede buscar en `GET /oficinas` la que tenga `gerenteId` igual a su id de usuario (requiere que la respuesta de oficina incluya `gerenteId`; confirmar en el JSON).
- `GET /users` devuelve todos los usuarios de una vez. Con muchos registros habrá que filtrar por `rol` o `activo` desde el frontend.
