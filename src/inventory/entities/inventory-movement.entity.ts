import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../users/entities/user.entity';
import { InventoryMovementType, InventoryReason } from '../enums/inventory.enums';

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Multi-tenant ──────────────────────────────────────────────────────────
  @Column()
  @Index()
  churchId: string;

  // ─── Item relation ─────────────────────────────────────────────────────────
  @Column()
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.movements, { nullable: false })
  @JoinColumn({ name: 'itemId' })
  item: InventoryItem;

  // ─── Movement data ─────────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: InventoryMovementType })
  type: InventoryMovementType;

  /** Always a positive integer */
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'enum', enum: InventoryReason })
  reason: InventoryReason;

  @Column({ type: 'text', nullable: true })
  observation: string;

  // ─── Who registered it ─────────────────────────────────────────────────────
  @Column({ nullable: true })
  registeredById: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'registeredById' })
  registeredBy: User;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;
}
