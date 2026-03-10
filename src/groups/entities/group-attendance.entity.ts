import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Index,
  JoinColumn,
} from 'typeorm';
import { GroupMeeting } from './group-meeting.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Entity('group_attendances')
@Unique(['meetingId', 'churchPersonId'])
@Index(['meetingId'])
export class GroupAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GroupMeeting, (meeting) => meeting.attendances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: GroupMeeting;

  @Column({ nullable: false })
  meetingId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchPersonId' })
  churchPerson: ChurchPerson;

  @Column({ nullable: false })
  churchPersonId: string;

  @Column({ default: false })
  present: boolean;

  @CreateDateColumn()
  recordedAt: Date;
}
