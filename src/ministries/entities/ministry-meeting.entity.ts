import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { MeetingNote } from './meeting-note.entity';

@Entity('ministry_meetings')
@Index(['ministryId'])
export class MinistryMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, (ministry) => ministry.meetings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  @Column()
  ministryId: string;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId: string;

  @OneToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendarEventId' })
  calendarEvent: CalendarEvent;

  @OneToOne(() => MeetingNote, (note) => note.meeting)
  meetingNote: MeetingNote;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
