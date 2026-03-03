import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MinistryRole } from '../../common/enums';

@Entity('ministry_members')
export class MinistryMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, (ministry) => ministry.members)
  ministry: Ministry;

  @ManyToOne(() => ChurchPerson, (member) => member.ministries)
  member: ChurchPerson;

  @Column({
    type: 'enum',
    enum: MinistryRole,
    default: MinistryRole.TEAM_MEMBER,
  })
  roleInMinistry: MinistryRole;

  @Column({ default: 'active' })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  joinedAt: Date;
}
