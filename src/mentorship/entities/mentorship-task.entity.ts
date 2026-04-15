import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { MentorshipProcess } from './mentorship-process.entity';
import { MentorshipMeeting } from './mentorship-meeting.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MentorshipTaskStatus } from '../enums/mentorship.enum';

@Entity('mentorship_tasks')
@Index(['processId', 'dueDate'])
export class MentorshipTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.tasks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorChurchPersonId' })
  creatorChurchPerson: ChurchPerson;

  @Column({ nullable: false })
  creatorChurchPersonId: string;

  @ManyToOne(() => ChurchPerson, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedChurchPersonId' })
  assignedChurchPerson: ChurchPerson;

  @Column({ nullable: true })
  assignedChurchPersonId: string | null;

  @Column({ type: 'boolean', default: false })
  isGroupTask: boolean;

  @ManyToOne(() => MentorshipMeeting, (meeting) => meeting.tasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: MentorshipMeeting;

  @Column({ nullable: true })
  meetingId: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  mentorInstruction: string;

  @Column({ type: 'text', nullable: true })
  menteeResponse: string;

  @Column({ type: 'text', nullable: true })
  mentorFeedback: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: MentorshipTaskStatus,
    default: MentorshipTaskStatus.ASSIGNED,
  })
  status: MentorshipTaskStatus;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
