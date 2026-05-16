import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  Index,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { GroupType, GroupVisibility } from '../enums/group.enums';
import { GroupParticipant } from './group-participant.entity';
import { GroupMeeting } from './group-meeting.entity';
import { StudyResource } from '../../resources/entities/study-resource.entity';

@Entity('groups')
@Index(['churchId', 'type'])
@Index(['churchId', 'visibility'])
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  objective: string;

  @Column({ type: 'boolean', default: false })
  hasStudyMaterial: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  studyMaterial: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  schedule: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    default: GroupType.SMALL_GROUP,
  })
  type: GroupType;

  @Column({
    type: 'enum',
    enum: GroupVisibility,
    default: GroupVisibility.PUBLIC,
  })
  visibility: GroupVisibility;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: false })
  churchId: string;

  @OneToMany(() => GroupParticipant, (participant) => participant.group)
  participants: GroupParticipant[];

  @OneToMany(() => GroupMeeting, (meeting) => meeting.group)
  meetings: GroupMeeting[];

  @ManyToMany(() => StudyResource, { eager: false })
  @JoinTable({
    name: 'group_study_resources',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'resourceId', referencedColumnName: 'id' },
  })
  resources: StudyResource[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
