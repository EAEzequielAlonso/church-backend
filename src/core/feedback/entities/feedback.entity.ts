import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import {
  FeedbackType,
  FeedbackModule,
  FeedbackStatus,
  FeedbackPriority,
  InternalPriority,
} from '../enums/feedback.enums';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
  })
  type: FeedbackType;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: FeedbackModule,
  })
  module: FeedbackModule;

  @Column({
    type: 'enum',
    enum: FeedbackPriority,
    default: FeedbackPriority.LOW,
  })
  priority: FeedbackPriority;

  @Column({
    type: 'enum',
    enum: InternalPriority,
    default: InternalPriority.P3,
  })
  internalPriority: InternalPriority;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.NEW,
  })
  status: FeedbackStatus;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  route: string;

  @Column({ type: 'text' })
  userAgent: string;

  @Column({ type: 'text', nullable: true })
  screen: string;

  @Column({ type: 'text', nullable: true })
  action: string;

  @CreateDateColumn()
  createdAt: Date;
}
