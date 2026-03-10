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
import { Group } from './group.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { GroupRole } from '../enums/group.enums';

@Entity('group_participants')
@Unique(['groupId', 'churchPersonId'])
@Index(['groupId'])
@Index(['churchPersonId', 'role'])
export class GroupParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (group) => group.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: false })
  groupId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchPersonId' })
  churchPerson: ChurchPerson;
  @Column({ nullable: false })
  churchPersonId: string;

  @Column({
    type: 'enum',
    enum: GroupRole,
    default: GroupRole.PARTICIPANT,
  })
  role: GroupRole;

  @CreateDateColumn()
  joinedAt: Date;
}
