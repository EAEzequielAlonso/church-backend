import { BaseDomainEvent } from './base-domain-event';

/**
 * Puerto Abstracto (Interfaz de Dominio)
 * Define el contrato que la capa de Infraestructura deberá cumplir para emitir eventos.
 * Permite a la Aplicación emitir eventos sin conocer sobre `EventEmitter2`.
 */
export interface DomainEventBus {
  publish(event: BaseDomainEvent): Promise<void>;
  publishAll(events: BaseDomainEvent[]): Promise<void>;
}
