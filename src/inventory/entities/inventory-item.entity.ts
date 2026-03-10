import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { InventoryMovement } from './inventory-movement.entity';
import { InventoryItemCategory } from '../enums/inventory.enums';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Multi-tenant ──────────────────────────────────────────────────────────
  @Column()
  @Index()
  churchId: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  // ─── Item data ─────────────────────────────────────────────────────────────
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: InventoryItemCategory,
    default: InventoryItemCategory.OTHER,
  })
  category: InventoryItemCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  /** Current stock — updated transactionally on every movement */
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  location: string;

  /** Soft-delete: 'inactive' keeps history but hides from active listings */
  @Column({ type: 'varchar', default: 'active' })
  status: 'active' | 'inactive';

  // ─── Ministry (optional) ───────────────────────────────────────────────────
  @Column({ nullable: true })
  ministryId: string;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  // ─── Movements ─────────────────────────────────────────────────────────────
  @OneToMany(() => InventoryMovement, (m) => m.item)
  movements: InventoryMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
