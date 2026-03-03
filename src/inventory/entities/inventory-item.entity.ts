import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { InventoryMovement } from './inventory-movement.entity';
import { InventoryItemCategory } from '../enums/inventory.enums';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  // Stock actual (se actualiza con hooks o servicio)
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  location: string; // Ubicación física (Ej: "Armario Salón Principal")

  @ManyToOne(() => Church, { nullable: false })
  church: Church;

  @ManyToOne(() => Ministry, { nullable: true })
  ministry: Ministry;

  @OneToMany(() => InventoryMovement, (movement) => movement.item)
  movements: InventoryMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
