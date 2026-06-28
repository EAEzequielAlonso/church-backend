# Frontend Integration Guide: Doctrinal Opinions

Este documento proporciona los detalles necesarios para la integración de las opiniones doctrinales privadas en el Frontend (Telyon y AdminApp).

## Pantallas

### Usuario: `ChurchOpinionForm`
Esta pantalla/modal se utiliza para que un usuario pueda aportar información doctrinal privada sobre una iglesia. 
- Sólo pueden enviar **una opinión por iglesia**. Si ya existe una, se actualizará en su lugar.
- **Formulario**:
  - `opinion` (Selector / Radio): Positivo, Neutral, Negativo.
  - `comment` (Texto opcional): Para añadir detalles adicionales que ayuden a la revisión.
- Al enviar la opinión, el usuario aporta información que facilita el proceso de moderación, pero **no afecta la vista pública de la iglesia**.

### Admin: `ChurchOpinionsReviewPage`
Esta pantalla es exclusiva para `AdminApp`.
- Muestra el listado de opiniones doctrinales emitidas para una iglesia.
- Permite filtrar entre "Todas" y "Pendientes de revisión".
- Tiene un botón o acción para marcar una opinión como **revisada** por el administrador.

---

## Endpoints

### 1. Crear o Actualizar Opinión (Usuario)
**Método:** `POST`
**Ruta:** `/doctrinal-opinions/church/:churchId`
**Autorización:** Requiere Bearer Token (Usuario Autenticado)

**Body:**
```json
{
  "opinion": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "comment": "Opcional: Detalles sobre la doctrina de la iglesia."
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "personId": "uuid",
  "churchId": "uuid",
  "opinion": "POSITIVE",
  "comment": "Opcional: Detalles sobre la doctrina de la iglesia.",
  "reviewedByAdmin": false,
  "createdAt": "2026-06-21T00:00:00Z",
  "updatedAt": "2026-06-21T00:00:00Z"
}
```

---

### 2. Consultar Opinión del Usuario Actual (Usuario)
**Método:** `GET`
**Ruta:** `/doctrinal-opinions/church/:churchId/my`
**Autorización:** Requiere Bearer Token (Usuario Autenticado)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "personId": "uuid",
  "churchId": "uuid",
  "opinion": "POSITIVE",
  "comment": "...",
  "reviewedByAdmin": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```
*Si no tiene opinión, retorna `404 Not Found`.*

---

### 3. Listar Opiniones de una Iglesia (AdminApp)
**Método:** `GET`
**Ruta:** `/doctrinal-opinions/admin/church/:churchId?filterPending=true`
**Autorización:** Requiere Bearer Token + Permiso Administrador (`ROLE_MANAGE`)

**Query Params:**
- `filterPending` (booleano opcional): Si es `true`, sólo retorna las opiniones con `reviewedByAdmin = false`.

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "personId": "uuid",
    "churchId": "uuid",
    "opinion": "POSITIVE",
    "comment": "...",
    "reviewedByAdmin": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### 4. Marcar Opinión como Revisada (AdminApp)
**Método:** `PATCH`
**Ruta:** `/doctrinal-opinions/admin/:id/review`
**Autorización:** Requiere Bearer Token + Permiso Administrador (`ROLE_MANAGE`)

**Body:** No requiere body.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "personId": "uuid",
  "churchId": "uuid",
  "opinion": "POSITIVE",
  "comment": "...",
  "reviewedByAdmin": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Flujo Completo

1. **Usuario Emite Opinión:**
   - El usuario abre la vista de la iglesia.
   - Navega hacia la sección de emitir una opinión doctrinal privada.
   - Envía el formulario (POST a `/doctrinal-opinions/church/:churchId`).
2. **Backend Procesa:**
   - Si la opinión no existía, la crea.
   - Si ya existía, la actualiza y resetea `reviewedByAdmin = false`.
   - Si es nueva, genera un **EcosystemContribution** (`DOCTRINAL_OPINION_SUBMITTED`).
3. **Admin Revisa:**
   - El administrador de Telyon entra a la `AdminApp`.
   - Navega al perfil administrativo de la iglesia.
   - Solicita la lista de opiniones doctrinales.
   - Lee la opinión y ejecuta la acción "Marcar como Revisada" (PATCH a `/doctrinal-opinions/admin/:id/review`).
4. **Finalización:**
   - La opinión queda como `reviewedByAdmin = true`.
   - Se concluye la participación de esa opinión en la moderación inmediata.

---

## Casos de Error

* **Iglesia inexistente:** Genera un error del ORM (ConstraintViolation) en la base de datos (dependiendo del FK), o 500. El frontend debe asegurarse de enviar a un `churchId` válido.
* **Usuario no autenticado:** Retorna `401 Unauthorized` por el `JwtAuthGuard`.
* **Opinión inválida:** Retorna `400 Bad Request` si el valor de `opinion` no está en el enum (`POSITIVE`, `NEUTRAL`, `NEGATIVE`).
* **Acceso no autorizado (Admin):** Retorna `403 Forbidden` si el usuario intenta acceder a rutas `/admin` sin el permiso `ROLE_MANAGE`.

---

## Estados UI

Se recomienda manejar los siguientes estados en el frontend:

* `loading`: Mientras se envía la petición de creación o la obtención de la opinión.
* `success`: Cuando el formulario se envía correctamente, mostrar un toast como "Opinión enviada. ¡Gracias por contribuir al ecosistema!".
* `validation_error`: Si el servidor responde 400, marcar los campos requeridos (ej. la elección de la opinión).
* `unauthorized`: Si caduca la sesión, redirigir al login.
