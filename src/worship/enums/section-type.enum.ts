/**
 * Tipo de sección dentro de una plantilla o reunión.
 * Define el comportamiento y la visualización de la sección.
 */
export enum SectionType {
  /** Alabanza — Bloque musical de adoración. Pide lista de canciones. */
  WORSHIP = 'WORSHIP',

  /** Exposición — Predicación o enseñanza bíblica. Pide título y pasaje. */
  PREACHING = 'PREACHING',

  /** Anuncio — Bloque de comunicados y avisos. */
  ANNOUNCEMENT = 'ANNOUNCEMENT',

  /** Tarea Cronometrada — Actividad del cronograma con duración definida (bienvenida, ofrenda, etc). */
  TIMED_ACTIVITY = 'TIMED_ACTIVITY',

  /** Tarea Global — Actividad que abarca todo el culto, sin tiempo asignado (sonido, proyección, etc). */
  GLOBAL_ACTIVITY = 'GLOBAL_ACTIVITY',
}

/** Metadatos en español para cada tipo de sección */
export const SectionTypeMeta: Record<SectionType, { label: string; description: string }> = {
  [SectionType.WORSHIP]: {
    label: 'Alabanza',
    description: 'Bloque musical de adoración',
  },
  [SectionType.PREACHING]: {
    label: 'Exposición',
    description: 'Predicación o enseñanza bíblica',
  },
  [SectionType.ANNOUNCEMENT]: {
    label: 'Anuncio',
    description: 'Comunicados y avisos',
  },
  [SectionType.TIMED_ACTIVITY]: {
    label: 'Tarea Cronometrada',
    description: 'Actividad con duración definida (bienvenida, ofrenda, etc.)',
  },
  [SectionType.GLOBAL_ACTIVITY]: {
    label: 'Tarea Global',
    description: 'Actividad sin tiempo (sonido, proyección, etc.)',
  },
};
