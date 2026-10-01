# RealtyHub — Auth Service: contexto para construir el frontend de login

> Este documento acompaña al archivo **OpenAPI JSON** (`/v3/api-docs`) del servicio.
> El JSON es la referencia exacta de cada endpoint (campos, tipos, códigos de respuesta).
> Este archivo explica **el flujo, las reglas y los detalles que el JSON no transmite bien**.
> Si hay contradicción en algún campo, manda el JSON; si es sobre comportamiento, manda este archivo.
>
> El frontend se construye con **React** (Vite + React Router).

---

## 1. Qué es este servicio

Microservicio de autenticación de RealtyHub (Spring Boot). Se encarga de:

- Registro con email y contraseña (+ verificación por correo).
- Login con email/contraseña y login con Google.
- Emisión de **access tokens** (JWT) y **refresh tokens** (cookie HttpOnly).
- Renovación de sesión, logout y recuperación de contraseña.

Los datos de perfil del usuario (nombre, rol, etc.) viven en otro microservicio (`user-service`); este
servicio solo gestiona credenciales y tokens. **No existe un endpoint `/me` aquí**: la información
básica del usuario (id y rol) se obtiene decodificando el access token.

Todas las rutas de este servicio son **públicas**: ninguna requiere el header `Authorization`.

---

## 2. Conceptos clave (leer antes de programar)

### 2.1 Dos tokens, dos lugares distintos

| Token | Dónde llega | Dónde se guarda en el frontend | Para qué sirve |
|---|---|---|---|
| **Access token** (JWT) | En el **body**: `{ "accessToken": "..." }` | **En memoria** (estado de la app / contexto de React). **No** en `localStorage` ni `sessionStorage` | Se envía a los demás microservicios en `Authorization: Bearer <token>` |
| **Refresh token** | En la **cookie** `refresh_token` (header `Set-Cookie`) | **No se toca.** La guarda y la envía el navegador | Obtener un nuevo access token vía `POST /auth/refresh` |

- La cookie es `HttpOnly`: **JavaScript no puede leerla ni verla**. No intentes leer `document.cookie`
  para saber si hay sesión. Para saber si hay sesión, llama a `POST /auth/refresh`.
- El body de login/refresh **nunca** trae el refresh token. Solo `accessToken`.

### 2.2 Atributos de la cookie

- `HttpOnly`: inaccesible desde JavaScript.
- `Secure`: solo viaja por HTTPS (en `localhost` los navegadores modernos lo permiten).
- `Path=/auth`: el navegador solo la envía a rutas `/auth/*` del API.
- `SameSite`: lo define el backend y puede cambiar; **no requiere nada distinto del frontend** mientras
  el frontend y el API estén bajo el dominio `realty-hub.site`.

### 2.3 `credentials: 'include'` es obligatorio

El frontend (`https://app.realty-hub.site`) y el API están en **orígenes distintos**. Para que el navegador
**guarde** la cookie al hacer login y la **envíe** en refresh/logout, **todas** las llamadas a `/auth/*`
deben hacerse con:

- `fetch`: `credentials: 'include'`
- axios: `withCredentials: true`

Si se olvida en el login, la cookie no se guarda y el refresh fallará siempre con 401.

### 2.4 CORS

Orígenes permitidos por el backend:

- `https://app.realty-hub.site` (producción)
- `http://localhost:5500` (desarrollo)

Cualquier otro origen/puerto será bloqueado por el navegador. **Vite usa el puerto `5173` por defecto**:
configurar `server: { port: 5500 }` en `vite.config.js`, o pedir al backend que agregue el origen.

### 2.5 Contenido del access token

JWT firmado con **RS256**. Payload:

```json
{
  "sub": "7b2f3c1e-....-....-....-............",   // id del usuario (UUID)
  "rol": "AGENTE",                                // ADMINISTRADOR_CENTRAL | GERENTE_OFICINA | AGENTE
  "exp": 1759000900                               // expiración (segundos epoch)
}
```

- El frontend puede **decodificar** el payload (base64url) para leer `sub`, `rol` y `exp` y decidir qué
  mostrar. **No** necesita validar la firma (eso lo hacen el gateway y los servicios con
  `GET /.well-known/jwks.json`).
- La duración del access token es corta (configurable en el servidor). **No asumas un valor fijo**: usa `exp`.

---

## 3. Endpoints (resumen)

Base: `API_BASE_URL` (pedir la URL exacta; en producción debe ser un subdominio de `realty-hub.site`).
Rutas relativas a esa base:

| Método | Ruta | Body | Respuesta OK | Cookie |
|---|---|---|---|---|
| POST | `/auth/register` | `{ email, password, confirmPassword, nombre }` | `201` sin body | — |
| GET | `/auth/verify-email?token=...` | — | `200` sin body | — |
| POST | `/auth/resend-verification` | `{ email }` | `200` sin body | — |
| POST | `/auth/login` | `{ email, password }` | `200 { accessToken }` | la crea |
| POST | `/auth/google` | `{ id_token }` | `200 { accessToken }` | la crea |
| POST | `/auth/refresh` | **sin body** | `200 { accessToken }` | la lee y la reemplaza |
| POST | `/auth/logout` | **sin body** | `200` sin body | la lee y la borra |
| POST | `/auth/forgot-password` | `{ email }` | `200` sin body | — |
| POST | `/auth/reset-password` | `{ token, password, confirmPassword }` | `200` sin body | — |
| GET | `/.well-known/jwks.json` | — | JWKS | — (no lo usa el frontend) |

Todos los bodies son JSON (`Content-Type: application/json`).

### Reglas de validación de contraseña (register y reset)

- Mínimo **8 caracteres**, al menos **una mayúscula** y **un número**.
  Regex del servidor: `^(?=.*[A-Z])(?=.*[0-9]).{8,}$`
- `confirmPassword` debe ser igual a `password`.
- Conviene validar lo mismo en el frontend para dar feedback inmediato, pero el servidor es la fuente de verdad.

---

## 4. Formato de errores

**Todas** las respuestas 4xx/5xx tienen este body:

```json
{
  "mensaje": "Este email o contraseña incorrecta",
  "status": 401,
  "timestamp": "2026-09-28T14:35:12.123"
}
```

- `mensaje` está en español y **listo para mostrar al usuario**.
- En errores de validación (400), `mensaje` trae **todos** los errores separados por `", "`.
- Decide la lógica de UI por **`status`**, no por el texto de `mensaje` (los textos pueden cambiar).

### Qué hacer con cada código

| Endpoint | Código | Significado | Qué debe hacer la UI |
|---|---|---|---|
| login | 401 | Email o contraseña incorrectos | Mostrar `mensaje` en el formulario |
| login | 403 | Email **no verificado** | Mostrar aviso + botón "Reenviar correo" → `POST /auth/resend-verification` |
| login | 409 | La cuenta es de **Google** | Indicar que use "Continuar con Google" |
| google | 401 | `id_token` inválido/expirado | Pedir que lo intente de nuevo |
| google | 409 | El email ya existe con cuenta email/contraseña | Indicar que use email y contraseña |
| register | 400 | Datos inválidos | Mostrar `mensaje` |
| register | 409 | Email ya registrado | Ofrecer ir a login / recuperar contraseña |
| verify-email | 400 | Enlace inválido, expirado o ya usado | Mostrar `mensaje` + opción de reenviar verificación |
| refresh | 401 | No hay sesión válida | Limpiar estado y mandar a login (no mostrar error) |
| reset-password | 400 | Token inválido/expirado/usado, o contraseña inválida | Mostrar `mensaje`; si expiró, ofrecer "olvidé mi contraseña" otra vez |
| cualquiera | 500 | Error inesperado del servidor | Mensaje genérico "Intenta de nuevo" |

---

## 5. Flujos completos

### 5.1 Registro + verificación de email

1. Usuario llena el formulario → `POST /auth/register`.
2. `201` → mostrar "Revisa tu correo para activar tu cuenta". **No hay sesión todavía** (no llega token).
3. El usuario recibe un correo con un botón que abre:
   **`{FRONTEND_URL}/verify-email?token=<token>`**
4. La ruta `/verify-email` (React Router) lee `token` de la query string (`useSearchParams`) y llama a
   `GET /auth/verify-email?token=<token>` (URL-encodear el token).
   ⚠️ Llamarlo **una sola vez**: el token es de un solo uso (ver sección 7.1 sobre `StrictMode`).
5. `200` → "Cuenta verificada" + botón a login. `400` → mostrar `mensaje` + formulario para reenviar.

- El enlace de verificación expira (días, configurable) y es de **un solo uso**.
- `POST /auth/resend-verification` invalida el enlace anterior y envía uno nuevo. Siempre responde `200`
  (aunque el correo no exista o ya esté verificado), así que la UI debe decir algo neutral:
  "Si la cuenta existe y no está verificada, te enviamos un nuevo correo".

### 5.2 Login con email y contraseña

1. `POST /auth/login` con `credentials: 'include'`.
2. `200 { accessToken }` → guardar en memoria, decodificar `rol`/`sub`, redirigir al área privada.
   El navegador ya guardó la cookie `refresh_token` automáticamente.
3. Errores: ver tabla de la sección 4 (401 / 403 / 409).

### 5.3 Login con Google

1. Usar **Google Identity Services** (botón "Sign in with Google"; en React, p. ej. `@react-oauth/google`
   con el componente `<GoogleLogin />`) con el **Client ID de Google del proyecto**
   (pedirlo al backend: debe ser el mismo con el que el servidor valida los tokens).
2. El callback de Google entrega `response.credential` → ese es el **`id_token`**.
   (No usar `useGoogleLogin` en modo access token: se necesita el **ID token**.)
3. `POST /auth/google` con `{ "id_token": response.credential }` y `credentials: 'include'`.
4. `200 { accessToken }` → igual que el login normal. Si el usuario no existía, se crea automáticamente
   (las cuentas de Google no necesitan verificar email).

### 5.4 Mantener la sesión (refresh)

- **Al cargar/recargar la app**: el access token en memoria se pierde. Llamar a `POST /auth/refresh`
  (sin body, con `credentials: 'include'`):
  - `200` → hay sesión: guardar el nuevo `accessToken`.
  - `401` → no hay sesión: mostrar login.
  - Mientras esa llamada está pendiente, mostrar un estado de carga (no redirigir a login todavía).
- **Cuando el access token expira**: llamar a `POST /auth/refresh` antes de que expire (usando `exp`)
  o al recibir un `401` de otro microservicio, y reintentar la petición original **una sola vez**.

⚠️ **Rotación de refresh token (muy importante)**:
cada refresh **invalida** la cookie anterior y pone una nueva. Si se envía un refresh token **ya usado**,
el servidor lo interpreta como robo y **cierra todas las sesiones del usuario**. Consecuencias:

- **Nunca** lanzar varios `POST /auth/refresh` en paralelo (p. ej. varias peticiones que reciben 401 a la
  vez, o el doble `useEffect` de `StrictMode`). Usar una única promesa compartida (*single-flight*) —
  ver el código de la sección 6.
- Con varias pestañas abiertas puede ocurrir lo mismo. Si se quiere soportar bien, coordinar con
  `BroadcastChannel` o simplemente tratar el 401 del refresh como "sesión cerrada, volver a login".

### 5.5 Logout

1. `POST /auth/logout` (sin body, con `credentials: 'include'`).
2. Borrar el access token de memoria y redirigir a login.
3. Hacer el paso 2 **aunque la petición falle** (401 si ya no había cookie).

### 5.6 Recuperar contraseña

1. Pantalla "¿Olvidaste tu contraseña?" → `POST /auth/forgot-password` con `{ email }`.
   Siempre `200` (también si el correo no existe o es cuenta de Google): mostrar mensaje neutral.
2. El usuario recibe un correo con un botón que abre:
   **`{FRONTEND_URL}/reset-password?token=<token>`**
3. La ruta `/reset-password` lee `token` de la URL (`useSearchParams`), pide nueva contraseña + confirmación, y llama a
   `POST /auth/reset-password` con `{ token, password, confirmPassword }`.
4. `200` → "Contraseña actualizada" + ir a login. El enlace expira en minutos y es de un solo uso.

---

## 6. Código de referencia (JavaScript)

Cliente mínimo que implementa todas las reglas anteriores. Es JS plano para usarlo como módulo
(`authClient.js`) dentro de la app React, p. ej. envuelto en un `AuthContext`/`AuthProvider`.

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // pedir la URL real

let accessToken = null;        // SOLO en memoria
let refreshPromise = null;     // single-flight para /auth/refresh

async function parseError(res) {
  try { return await res.json(); }             // { mensaje, status, timestamp }
  catch { return { mensaje: 'Error inesperado', status: res.status }; }
}

async function authFetch(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',                     // obligatorio para la cookie
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseError(res);
  const text = await res.text();                // muchos endpoints responden sin body
  return text ? JSON.parse(text) : null;
}

export async function login(email, password) {
  const { accessToken: token } = await authFetch('/auth/login', { body: { email, password } });
  accessToken = token;
  return decodeJwt(token);                      // { sub, rol, exp }
}

export async function loginWithGoogle(idToken) {
  const { accessToken: token } = await authFetch('/auth/google', { body: { id_token: idToken } });
  accessToken = token;
  return decodeJwt(token);
}

export const register = (data) => authFetch('/auth/register', { body: data });
export const verifyEmail = (token) =>
  authFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'GET' });
export const resendVerification = (email) => authFetch('/auth/resend-verification', { body: { email } });
export const forgotPassword = (email) => authFetch('/auth/forgot-password', { body: { email } });
export const resetPassword = (data) => authFetch('/auth/reset-password', { body: data });

export function refresh() {
  if (!refreshPromise) {
    refreshPromise = authFetch('/auth/refresh')
      .then(({ accessToken: token }) => { accessToken = token; return decodeJwt(token); })
      .catch((err) => { accessToken = null; throw err; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function logout() {
  try { await authFetch('/auth/logout'); } catch { /* ignorar */ }
  accessToken = null;
}

// Para llamar a OTROS microservicios con el access token
export async function apiFetch(url, options = {}, retried = false) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 && !retried) {
    await refresh();                            // si falla, lanza → ir a login
    return apiFetch(url, options, true);
  }
  return res;
}

export function decodeJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  return JSON.parse(json);
}

// Al iniciar la app (p. ej. en el AuthProvider):
// refresh().then(user => setUser(user)).catch(() => setUser(null));
```

---

## 7. Rutas que el frontend (React) necesita

| Ruta | Obligatoria | Notas |
|---|---|---|
| Login (email/contraseña + botón Google) | Sí | Manejar 401 / 403 / 409 |
| Registro | Sí | Validar contraseña en cliente; tras 201 mostrar "revisa tu correo" |
| **`/verify-email`** | **Sí, con esa ruta exacta** | El correo enlaza a `{FRONTEND_URL}/verify-email?token=...` |
| **`/reset-password`** | **Sí, con esa ruta exacta** | El correo enlaza a `{FRONTEND_URL}/reset-password?token=...` |
| Olvidé mi contraseña | Sí | Formulario con email |
| Reenviar verificación | Recomendado | Puede ser un botón dentro de login (tras un 403) |

`/verify-email` y `/reset-password` deben ser rutas **en la raíz** de la app y **públicas** (sin requerir sesión).
Los nombres de las demás rutas son libres. Si se quiere otro nombre para estas dos, hay que avisar al backend,
porque es el backend quien construye los enlaces de los correos.

**Hosting (Vercel u otro)**: como el usuario llega a `/verify-email?token=...` directamente desde el correo,
el hosting debe redirigir todas las rutas a `index.html` (SPA fallback). En Vercel con Vite:

```json
// vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

### 7.1 Cuidado con `React.StrictMode` y los `useEffect`

En desarrollo, `StrictMode` ejecuta **dos veces** los `useEffect` al montar. Aquí eso rompe cosas:

- **`/verify-email`**: la 2.ª llamada responde `400 "Este enlace ya fue utilizado"` y la UI mostraría error
  aunque la verificación fue exitosa.
- **`refresh()` al iniciar la app**: dos refresh con la misma cookie = reutilización de refresh token →
  **el servidor cierra todas las sesiones del usuario**. El single-flight del `authClient` de la sección 6 lo
  evita si ambas llamadas pasan por la misma función `refresh()`.

Protege las llamadas de un solo uso con un `useRef`:

```jsx
const done = useRef(false);
useEffect(() => {
  if (done.current) return;
  done.current = true;
  verifyEmail(token).then(/* ... */).catch(/* ... */);
}, [token]);
```

---

## 8. Errores comunes a evitar

- ❌ Guardar el access token en `localStorage` → ✅ en memoria + `refresh` al cargar la app.
- ❌ Olvidar `credentials: 'include'` en login/google → la cookie nunca se guarda.
- ❌ Intentar leer `refresh_token` desde JS → es HttpOnly, no es posible ni necesario.
- ❌ Enviar body en `/auth/refresh` o `/auth/logout` → no llevan body; todo va en la cookie.
- ❌ Varios refresh en paralelo → cierra todas las sesiones del usuario (usar single-flight).
- ❌ Buscar el refresh token en la respuesta JSON → solo viene `accessToken`.
- ❌ Usar el access token de Google en `/auth/google` → debe ser el **ID token** (`credential`).
- ❌ Decidir la UI por el texto de `mensaje` → usar `status`.
- ❌ Probar desde un origen no permitido por CORS: en local solo está permitido `http://localhost:5500`
  (Vite usa `5173` por defecto → configurar `server: { port: 5500 }` en `vite.config.js` o pedir al backend
  que agregue el origen).
- ❌ Llamar dos veces a `/auth/verify-email` o a `/auth/refresh` por el doble `useEffect` de `StrictMode` (sección 7.1).
- ❌ Olvidar el SPA fallback en el hosting → los enlaces de los correos darían 404.

---

## 9. Datos que hay que pedirle al equipo de backend

- `API_BASE_URL` de producción (y si pasa por un gateway con algún prefijo de ruta).
- **Google Client ID** para el botón de Google Sign-In.
- `FRONTEND_URL` configurado en el servidor (para que los enlaces de los correos apunten al frontend correcto).
- Si se necesita un origen CORS adicional para desarrollo.
