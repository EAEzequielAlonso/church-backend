import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import {
  MentorshipType,
  MentorshipMode,
  MentorshipStatus,
} from '../enums/mentorship.enum';
import { MentorshipProcessParticipant } from './mentorship-process-participant.entity';
import { MentorshipMeeting } from './mentorship-meeting.entity';
import { MentorshipTask } from './mentorship-task.entity';
import { MentorshipNote } from './mentorship-note.entity';

@Entity('mentorship_processes')
@Index(['churchId', 'status'])
@Index(['type', 'mode'])
export class MentorshipProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MentorshipType,
  })
  type: MentorshipType;

  @Column({
    type: 'enum',
    enum: MentorshipMode,
  })
  mode: MentorshipMode;

  @Column({ type: 'varchar'})
  motive: string;

  @Column({
    type: 'enum',
    enum: MentorshipStatus,
    default: MentorshipStatus.ACTIVE,
  })
  status: MentorshipStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  closeObservation: string;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: false })
  churchId: string;

  @OneToMany(
    () => MentorshipProcessParticipant,
    (participant) => participant.process,
    { cascade: true },
  )
  participants: MentorshipProcessParticipant[];

  @OneToMany(() => MentorshipMeeting, (meeting) => meeting.process, {
    cascade: true,
  })
  meetings: MentorshipMeeting[];

  @OneToMany(() => MentorshipNote, (note) => note.process, { cascade: true })
  notes: MentorshipNote[];

  @OneToMany(() => MentorshipTask, (task) => task.process, { cascade: true })
  tasks: MentorshipTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
