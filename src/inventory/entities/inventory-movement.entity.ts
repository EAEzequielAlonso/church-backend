import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../users/entities/user.entity';
import {
  InventoryMovementType,
  InventoryInReason,
  InventoryOutReason,
} from '../enums/inventory.enums';

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InventoryItem, (item) => item.movements, { nullable: false })
  item: InventoryItem;

  @Column({
    type: 'enum',
    enum: InventoryMovementType,
  })
  type: InventoryMovementType;

  @Column({ type: 'int' })
  quantity: number; // Siempre positivo

  // Guardamos el motivo como string o enum combinado?
  // Mejor separar o usar un campo genérico validado en servicio.
  // Usaremos strings para permitir flexibilidad si TypeORM se queja de enums mixtos,
  // pero idealmente 2 columnas nullable o 1 columna enum que sea la unión.
  // Simplificación: 1 columna string que guarda el valor del enum, validado por DTO.
  @Column()
  reason: string;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @ManyToOne(() => User, { nullable: true })
  registeredBy: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;
}
