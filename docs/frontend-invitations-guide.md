# Guía de Integración Frontend: Módulo Invitations

Esta guía detalla cómo el cliente (Frontend) debe integrarse con el nuevo módulo de Invitaciones de Telyon. 
El flujo permite a un usuario invitar a otra persona, que al registrarse correctamente acreditará una contribución en favor de quien envió la invitación.

---

## 1. Flujo Completo

1. **Usuario A (Invitador):** Genera una invitación desde la plataforma, lo cual envía un correo electrónico.
2. **Usuario B (Invitado):** Recibe el correo con un enlace único hacia Telyon (ej. `https://telyon.app/auth/register?invite=TOKEN`).
3. **Usuario B:** Hace clic en el enlace, entra a la *InvitationLandingPage* que valida y muestra los detalles de la invitación.
4. **Usuario B:** Procede a la *RegisterFromInvitationPage* y completa el formulario.
5. **Backend:** El backend procesa el registro, marca la invitación como aceptada y asigna la contribución automáticamente dentro de una única transacción.
6. **Usuario B:** Ve la *InvitationSuccessPage*.

---

## 2. Endpoints

### 2.1. Crear Invitación

**Método:** `POST`
**Ruta:** `/invitations`
**Autenticación:** Requerida (JWT Bearer)

**Request Body:**
```json
{
  "type": "GENERAL_USER", // o "NEED_SIGNAL_USER", "CHURCH_ADMIN_CLAIM", "CHURCH_MEMBERSHIP"
  "invitedEmail": "amigo@example.com",
  "targetChurchId": "uuid-opcional" 
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-de-invitacion",
  "type": "GENERAL_USER",
  "status": "PENDING",
  "invitedEmail": "amigo@example.com",
  "token": "token-seguro-generado",
  "expiresAt": "2024-05-20T12:00:00Z"
}
```

---

### 2.2. Consultar Invitación (Landing)

**Método:** `GET`
**Ruta:** `/invitations/:token`
**Autenticación:** Ninguna (Público)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "type": "GENERAL_USER",
  "status": "PENDING",
  "invitedEmail": "amigo@example.com",
  "token": "token",
  "inviterPerson": {
    "firstName": "Juan",
    "lastName": "Perez"
  },
  "targetChurch": {
    "canonicalName": "Iglesia Central"
  }
}
```

**Manejo de Errores (404 Not Found):**
Si el token es inválido, mostrar *InvitationExpiredPage* o un mensaje de error.

---

### 2.3. Registrar Usuario desde Invitación

**Método:** `POST`
**Ruta:** `/invitations/register`
**Autenticación:** Ninguna (Público)

**Request Body (`RegisterFromInvitationDto`):**
```json
{
  "email": "amigo@example.com",
  "password": "Password123!",
  "firstName": "Amigo",
  "lastName": "Gomez",
  "inviteToken": "token-seguro-generado"
}
```
*Nota: El campo `email` debe coincidir exactamente con el `invitedEmail` de la invitación original.*

**Response (201 Created):**
```json
{
  "message": "Registro e invitación procesados con éxito"
}
```

**Manejo de Errores Comunes:**
- `400 Bad Request`: "El token de invitación es inválido"
- `400 Bad Request`: "La invitación ha expirado"
- `400 Bad Request`: "La invitación ya ha sido utilizada, cancelada o expirada"
- `400 Bad Request`: "The invitation does not belong to this email address." (Si el usuario intenta usar otro email).

---

## 3. Pantallas (UI)

### 3.1. InvitationLandingPage
- **Objetivo:** Recibe al usuario cuando hace clic en el correo electrónico.
- **Acción:** Llama a `GET /invitations/:token`.
- **Estado UI:** `loading` -> `success` o `invalid`.
- **Visualización:** "Has sido invitado por Juan Perez a unirte a Telyon."
- **Navegación:** Botón "Crear mi cuenta" que lleva a *RegisterFromInvitationPage*.

### 3.2. RegisterFromInvitationPage
- **Objetivo:** Formulario de registro adaptado.
- **Acción:** Llama a `POST /invitations/register`.
- **Estado UI:** El campo de *Email* debería venir pre-completado y **bloqueado (readonly)** usando la información traída en la Landing, para evitar el error de mismatch.
- **Manejo de Errores:** Mostrar *validation errors* (contraseña débil, campos faltantes, etc).

### 3.3. InvitationExpiredPage
- **Objetivo:** Mostrar un mensaje amigable si el endpoint `GET /invitations/:token` responde con 404 o si la invitación está vencida.

### 3.4. InvitationSuccessPage
- **Objetivo:** Tras el registro exitoso, dar la bienvenida y derivar al flujo de Login.

---

## 4. Casos Especiales

- **Email Mismatch:** Si por error el usuario logra enviar un `email` distinto al `invitedEmail`, el backend rechazará la transacción con HTTP 400 y hará rollback completo.
- **Atomicidad:** Si ocurre un error en la creación del usuario (ej. email ya existe), el token de invitación seguirá siendo válido y el estado será PENDING, permitiendo reintentar (por ejemplo con Login, aunque este flujo asume usuarios nuevos).
