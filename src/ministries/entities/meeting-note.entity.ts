import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { Person } from '../../users/entities/person.entity';

@Entity('meeting_notes')
export class MeetingNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => CalendarEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: CalendarEvent;

  @Column()
  eventId: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  decisions: string;

  @Column({ type: 'text', nullable: true })
  nextSteps: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'createdById' })
  createdBy: Person;

  @Column()
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;
}
