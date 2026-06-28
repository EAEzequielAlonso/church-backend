import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType } from '../enums/notification.enum';

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'varchar', nullable: true })
  link: string;

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
