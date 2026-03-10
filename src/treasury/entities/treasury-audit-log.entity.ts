import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';

@Entity('treasury_audit_logs')
@Index(['churchId', 'createdAt'])
@Index(['churchId', 'entityType', 'entityId'])
export class TreasuryAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  churchId: string;

  // --- What was affected ---

  @Column({ type: 'enum', enum: AuditEntityType })
  entityType: AuditEntityType;

  @Column('uuid')
  entityId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  // --- State snapshots (JSONB) ---

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, any> | null;

  // --- Schema versioning ---

  @Column({ type: 'varchar', length: 50, default: 'v1' })
  entityVersion: string;

  // --- Who did it ---

  @Column('uuid')
  performedByUserId: string;

  @Column({ nullable: true })
  performedByEmail: string;

  @Column({ nullable: true })
  performedByRole: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  reason: string;

  // --- When ---

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
