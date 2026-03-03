import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { MentorshipProcess } from './mentorship-process.entity';
import { MentorshipNote } from './mentorship-note.entity';
import { MentorshipTask } from './mentorship-task.entity';

@Entity('mentorship_meetings')
@Index(['processId', 'scheduledDate'])
export class MentorshipMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.meetings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

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
