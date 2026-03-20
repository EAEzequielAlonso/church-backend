import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ministry } from './ministry.entity';

@Entity('ministry_meetings')
@Index(['ministryId', 'date'])
export class MinistryMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  @Column()
  ministryId: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
