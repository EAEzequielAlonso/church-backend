import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { BaseDomainEvent } from '../../domain/events/base-domain-event';

/**
 * Adaptador de Infraestructura para el Event Bus.
 * Delega los eventos estipulados por el Root Aggregate de DDD usando la herramienta subyacente de NestJS.
 */
@Injectable()
export class NestEventBus implements DomainEventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: BaseDomainEvent): Promise<void> {
    // Emitimos usando el nombre estático del Objeto Evento para los Listeners
    this.eventEmitter.emit(event.eventName, event);
  }

  async publishAll(events: BaseDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
