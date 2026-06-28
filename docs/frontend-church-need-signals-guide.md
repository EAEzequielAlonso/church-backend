# Guía de Integración Frontend: Church Need Signals

Este documento detalla el uso de los endpoints del nuevo módulo `Church Need Signals`.

> [!IMPORTANT]
> Los endpoints protegidos requieren enviar el token JWT en el header de autorización (`Authorization: Bearer <token>`).

## Endpoints

### 1. Crear una Señal de Necesidad de Iglesia
Reporta una ciudad/zona que actualmente carece de iglesias sanas.

- **URL**: `POST /public/church-need-signals`
- **Auth Requerida**: Sí
- **Request Body**:
```json
{
  "country": "Argentina",
  "state": "Buenos Aires",
  "city": "Mar del Plata",
  "latitude": -38.0055,
  "longitude": -57.5426,
  "observation": "Opcional: Detalles del por qué se considera una necesidad."
}
```
- **Respuestas Posibles**:
  - `201 Created`: Señal creada exitosamente.
  - `409 Conflict`: Ya existe una señal para esta ubicación exacta.

### 2. Apoyar una Señal
El usuario indica que apoya la señal (confirma la necesidad territorial).

- **URL**: `POST /public/church-need-signals/:id/support`
- **Auth Requerida**: Sí
- **Request Body**: Ninguno.
- **Respuestas Posibles**:
  - `201 Created`: Apoyo registrado.
  - `404 Not Found`: La señal no existe.
  - `409 Conflict`: El usuario ya ha apoyado esta señal.

### 3. Listar Señales (Feed / Exploración)
Obtener el feed o filtrar las señales existentes en el mapa/directorio.

- **URL**: `GET /public/church-need-signals`
- **Auth Requerida**: No
- **Query Params**:
  - `country` (opcional): Filtrar por país.
  - `state` (opcional): Filtrar por provincia.
  - `city` (opcional): Filtrar por ciudad.
  - `sortBy` (opcional): `DATE_DESC` (por defecto) o `SUPPORTS_DESC`.
  - `page` (opcional): default 1.
  - `limit` (opcional): default 10.
- **Respuesta**:
```json
{
  "items": [
    {
      "id": "uuid",
      "observation": "...",
      "createdAt": "...",
      "needLocation": { "country": "...", "state": "...", "city": "..." },
      "person": { "firstName": "...", "lastName": "..." },
      "supportCount": 15
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 4. Obtener Detalles de una Señal
Recuperar toda la información de la señal para su página de perfil.

- **URL**: `GET /public/church-need-signals/:id`
- **Auth Requerida**: No
- **Respuesta**:
```json
{
  "id": "uuid",
  "observation": "...",
  "person": { ... },
  "needLocation": { ... },
  "supportCount": 25,
  "recentInformation": [ ...ultimos_5_aportes... ]
}
```

### 5. Aportar Información (Inteligencia Territorial)
Agregar datos relevantes sobre la zona no alcanzada.

- **URL**: `POST /public/church-need-signals/:id/information`
- **Auth Requerida**: Sí
- **Request Body**:
```json
{
  "category": "CULTURE", // GENERAL, LANGUAGE, CULTURE, RELIGION, DEMOGRAPHICS, etc.
  "title": "Datos culturales clave de la ciudad",
  "content": "Contenido en texto largo o markdown...",
  "attachments": [] // Opcional: Array de objetos JSON { "type": "IMAGE", "url": "..." }
}
```
- **Respuestas Posibles**:
  - `201 Created`: Aporte registrado exitosamente.
  - `404 Not Found`: La señal no existe.

### 6. Listar Información de la Señal
Obtener el listado histórico de los aportes de inteligencia de la zona.

- **URL**: `GET /public/church-need-signals/:id/information`
- **Auth Requerida**: No
- **Query Params**:
  - `category` (opcional): Filtrar por una categoría de información.
  - `page` (opcional): default 1.
  - `limit` (opcional): default 10.
- **Respuesta Paginada**:
```json
{
  "items": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

## Flujo Completo Sugerido (UX)

1. **Explorar / Mapa**: El usuario entra a la sección "Zonas de Necesidad". Se llama al `GET /public/church-need-signals` para cargar las banderas en el mapa.
2. **Crear Nueva Señal**: Si la ciudad del usuario no tiene iglesia y no figura en el mapa, hace clic en "Reportar Necesidad".
   - Interfaz pide País, Estado, Ciudad, coordenadas exactas.
   - Envía el `POST /public/church-need-signals`.
   - Si da `409 Conflict`, sugerir al usuario que vea la señal ya existente de esa ciudad y la apoye.
3. **Ver Señal**: Al hacer clic en un marcador, entra a la página de la señal llamando a `GET /public/church-need-signals/:id`.
4. **Apoyar**: Dentro de la página, hay un botón "Yo también veo esta necesidad". Si el usuario está logueado, llama a `POST /public/church-need-signals/:id/support`. El frontend suma 1 localmente al contador.
5. **Colaborar con Información**: Debajo hay una sección de "Inteligencia Territorial". Si el usuario conoce la ciudad, usa el formulario para "Aportar Conocimiento". Selecciona la categoría, escribe el reporte y llama al `POST /public/church-need-signals/:id/information`.
