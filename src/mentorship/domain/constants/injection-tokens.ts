/**
 * Injection token estricto para el Repositorio de Mentoría.
 * Al usar un Symbol en lugar de un String mágico, prevenimos colisiones en el contenedor de DI de NestJS,
 * manteniendo el acoplamiento a nivel de abstracción (Puerto del Dominio).
 */
export const MENTORSHIP_REPOSITORY_TOKEN = Symbol(
  'IMentorshipProcessRepository',
);
export const DOMAIN_EVENT_BUS_TOKEN = Symbol('DOMAIN_EVENT_BUS');
