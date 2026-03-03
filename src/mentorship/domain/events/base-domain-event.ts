/**
 * Clase abstracta pura de dominio.
 * Ninguna dependencia del framework (ej: NestJS EventEmitter) de be existir aquí.
 */
export abstract class BaseDomainEvent {
  public readonly occurredOn: Date;

  constructor() {
    this.occurredOn = new Date();
  }

  /**
   * Propiedad que devolverá el nombre de la clase hija a modo de string
   * para facilitar la subscripción de la infraestructura encoladora.
   */
  abstract get eventName(): string;
}
