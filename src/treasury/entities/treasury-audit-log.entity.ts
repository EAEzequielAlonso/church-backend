import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { TreasuryTransaction } from './treasury-transaction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('treasury_audit_logs')
export class TreasuryAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TreasuryTransaction, { onDelete: 'CASCADE' })
  transaction: TreasuryTransaction;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  oldAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  newAmount: number;

  @Column({ nullable: true })
  oldDescription: string;

  @Column({ nullable: true })
  newDescription: string;

  @Column({ nullable: true })
  changeReason: string;

  @ManyToOne(() => User)
  changedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
