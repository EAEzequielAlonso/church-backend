import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { MentorshipProcess } from './mentorship-process.entity';
import { MentorshipMeeting } from './mentorship-meeting.entity';
import { ChurchPerson } from '../../../members/entities/church-person.entity';

@Entity('mentorship_tasks')
@Index(['processId', 'dueDate'])
export class MentorshipTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.tasks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  creatorChurchPerson: ChurchPerson;

  @Column({ nullable: false })
  creatorChurchPersonId: string;

  @ManyToOne(() => ChurchPerson, { nullable: true, onDelete: 'CASCADE' })
  assignedChurchPerson: ChurchPerson;

  @Column({ nullable: true })
  assignedChurchPersonId: string;

  @Column({ type: 'boolean', default: false })
  isGroupTask: boolean;

  @ManyToOne(() => MentorshipMeeting, (meeting) => meeting.tasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  meeting: MentorshipMeeting;

  @Column({ nullable: true })
  meetingId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
