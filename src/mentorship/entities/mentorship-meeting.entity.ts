import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { MentorshipProcess } from './mentorship-process.entity';
import { MentorshipNote } from './mentorship-note.entity';
import { MentorshipTask } from './mentorship-task.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('mentorship_meetings')
@Index(['processId'])
export class MentorshipMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.meetings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId: string;

  @OneToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendarEventId' })
  calendarEvent: CalendarEvent;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => MentorshipNote, (note) => note.meeting)
  notes: MentorshipNote[];

  @OneToMany(() => MentorshipTask, (task) => task.meeting)
  tasks: MentorshipTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
