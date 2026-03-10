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
import { ChurchPerson } from '../../../members/entities/church-person.entity';
import {
  MentorshipRole,
  ParticipantStatus,
} from '../../domain/enums/mentorship.enum';

@Entity('mentorship_process_participants')
@Index(['processId', 'churchPersonId'], { unique: true })
@Index(['churchPersonId', 'role'])
export class MentorshipProcessParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MentorshipProcess, (process) => process.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: MentorshipProcess;

  @Column({ nullable: false })
  processId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchPersonId' })
  churchPerson: ChurchPerson;

  @Column({ nullable: false })
  churchPersonId: string;

  @Column({
    type: 'enum',
    enum: MentorshipRole,
  })
  role: MentorshipRole;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
