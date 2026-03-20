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
import { MentorshipNoteType } from '../enums/mentorship.enum';

@Entity('mentorship_notes')
@Index(['processId', 'createdAt'])
export class MentorshipNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.notes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorChurchPersonId' })
  authorChurchPerson: ChurchPerson;

  @Column({ nullable: false })
  authorChurchPersonId: string;

  @ManyToOne(() => MentorshipMeeting, (meeting) => meeting.notes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: MentorshipMeeting;

  @Column({ nullable: true })
  meetingId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({
    type: 'enum',
    enum: MentorshipNoteType,
  })
  type: MentorshipNoteType;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
