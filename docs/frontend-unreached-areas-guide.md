# Guía de Integración Frontend: Módulo UnreachedAreas

Esta guía detalla los endpoints REST y los payloads necesarios para integrar el módulo `UnreachedAreas` en el frontend, siguiendo las directrices oficiales de Telyon.

---

## 1. Crear un Área No Alcanzada

**Endpoint:** `POST /public/unreached-areas`
**Autorización:** Requiere JWT (`Authorization: Bearer <token>`)

Este endpoint recibe la ubicación geográfica del grupo y sus datos misionológicos mínimos. El backend se encarga de resolver las coordenadas automáticamente (geocoding) y registrar la contribución/actividad.

### Payload

```json
{
  "country": "Argentina",
  "state": "Chaco",
  "city": "El Sauzalito",
  "title": "Comunidad Wichí de El Sauzalito",
  "description": "Comunidad aislada con fuerte arraigo a creencias ancestrales.",
  "population": 3000,
  "language": "Wichí Lhamtés",
  "ethnicity": "Wichí",
  "religion": "Animismo / Catolicismo Sincrético",
  "bibleAvailable": false,
  "churchKnown": false,
  "hostileEnvironment": false,
  "governmentRestrictions": false,
  "difficultAccess": true,
  "missionaryNotes": "El acceso se dificulta en época de lluvias. Hay mucha desconfianza inicial."
}
```

### Respuesta Exitosa (201 Created)

```json
{
  "id": "uuid",
  "title": "Comunidad Wichí de El Sauzalito",
  "status": "OPEN",
  ...
}
```

---

## 2. Listar Áreas No Alcanzadas

**Endpoint:** `GET /public/unreached-areas`
**Autorización:** Público (no requiere JWT)

Permite obtener el catálogo de áreas con soporte de paginación y filtros geográficos.

### Parámetros de Query (Opcionales)

*   `country`: Nombre del país (ej. `Argentina`)
*   `state`: Nombre de la provincia/estado
*   `city`: Nombre de la ciudad
*   `status`: Estado del área (`OPEN` o `REACHED`)
*   `page`: Número de página (default: 1)
*   `limit`: Resultados por página (default: 20)

### Respuesta Exitosa (200 OK)

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Comunidad Wichí de El Sauzalito",
      "status": "OPEN",
      "needLocation": {
        "id": "uuid",
        "country": "Argentina",
        "state": "Chaco",
        "city": "El Sauzalito",
        "latitude": -24.4,
        "longitude": -61.6
      },
      "reporterPerson": {
        "id": "uuid",
        "firstName": "Juan",
        "lastName": "Pérez",
        ...
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

## 3. Obtener Detalle de un Área

**Endpoint:** `GET /public/unreached-areas/:id`
**Autorización:** Público

### Respuesta Exitosa (200 OK)

Retorna la entidad completa, incluyendo todos sus campos misionológicos, su estado y ubicación.

---

## 4. Actualizar Datos Misionológicos

**Endpoint:** `PATCH /public/unreached-areas/:id`
**Autorización:** Requiere JWT (Solo Creador o Administrador del Sistema)

Permite actualizar parcialmente los campos descriptivos (NO se puede modificar la ubicación por esta vía).

### Payload (Ejemplo Parcial)

```json
{
  "population": 3200,
  "bibleAvailable": true
}
```

---

## 5. Cambiar el Estado (Marcar como Alcanzada)

**Endpoint:** `PATCH /public/unreached-areas/:id/status`
**Autorización:** Requiere JWT (Solo Creador o Administrador del Sistema)

Altera el estado vital del área. Si se pasa a `REACHED`, se disparará una actividad pública `UNREACHED_AREA_REACHED`.

### Payload

```json
{
  "status": "REACHED"
}
```

---

## 6. Agregar Conocimiento (NeedInformation)

**Endpoint:** `POST /public/unreached-areas/:id/information`
**Autorización:** Requiere JWT

Permite a cualquier usuario aportar inteligencia (documentos, testimonios, tips culturales) al área. Genera la contribución y actividad `NEED_INFORMATION_ADDED`.

### Payload

```json
{
  "category": "CULTURE",
  "title": "Estructura de Liderazgo Local",
  "content": "Para ingresar a la comunidad, es imprescindible hablar primero con el cacique local. Evitar ingresar con vehículos directamente a la plaza central.",
  "attachments": []
}
```
*(Valores posibles para category: `GENERAL`, `LANGUAGE`, `CULTURE`, `RELIGION`, `DEMOGRAPHICS`, `SECURITY`, `TRANSPORT`, `CONTACT`, `LEGAL`, `RESOURCES`, `TESTIMONY`, `OTHER`)*

---

## 7. Listar Conocimiento de un Área

**Endpoint:** `GET /public/unreached-areas/:id/information`
**Autorización:** Público

Recupera todo el conocimiento asociado al área.

### Parámetros de Query

*   `category` (opcional): Filtra por una categoría específica.
*   `page`: (default: 1)
*   `limit`: (default: 10)

### Respuesta Exitosa (200 OK)

```json
{
  "items": [
    {
      "id": "uuid",
      "category": "CULTURE",
      "title": "Estructura de Liderazgo Local",
      "content": "...",
      "person": { ... }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```
