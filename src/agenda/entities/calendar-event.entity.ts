import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Person } from '../../users/entities/person.entity';
import { MeetingNote } from '../../ministries/entities/meeting-note.entity';
import { CalendarEventType, MinistryEventType } from '../../common/enums';

@Entity('calendar_events')
@Index(['type', 'ownerId', 'startDate'])
@Index(['churchId', 'startDate'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
    default: CalendarEventType.OTHER,
  })
  type: CalendarEventType;

  @Column({
    type: 'enum',
    enum: MinistryEventType,
    nullable: true,
  })
  ministryEventType: MinistryEventType;

  @Column({ nullable: true })
  color: string; // For UI customization

  @Column({ default: false })
  isAllDay: boolean;

  // 🔗 Relations

  @Column('uuid', { nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  churchId: string;

  @Column({ nullable: true })
  organizerId: string;

  // For PERSONAL events or "created by"
  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'organizerId' })
  organizer: Person;

  // Specific assignments (e.g. Preacher for a Sunday) or Attendees
  @ManyToMany(() => Person)
  @JoinTable({ name: 'calendar_event_attendees' })
  attendees: Person[];

  @OneToOne(() => MeetingNote, (note) => note.event)
  meetingNote: MeetingNote;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
