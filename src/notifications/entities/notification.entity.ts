import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  LOAN_REQUESTED = 'LOAN_REQUESTED',
  LOAN_APPROVED = 'LOAN_APPROVED',
  LOAN_REJECTED = 'LOAN_REJECTED',
  LOAN_RETURNED = 'LOAN_RETURNED',
  GENERIC = 'GENERIC',
}

@Entity('notifications')
@Index(['churchId', 'userId', 'read'])
@Index(['churchId', 'userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Multi-tenancy: every notification belongs to a church.
   * NOT nullable — a notification without a church is invalid.
   */
  @Column({ nullable: false })
  @Index()
  churchId: string;

  /**
   * Target recipient — the user (by their User.id, not memberId).
   * NOT nullable.
   */
  @Column({ nullable: false })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERIC,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  /**
   * The module that generated this notification (e.g. 'LOAN', 'EVENT').
   * Allows deep-linking and grouping.
   */
  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
