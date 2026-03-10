import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MinistryRole } from '../../common/enums';

@Entity('ministry_members')
export class MinistryMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, (ministry) => ministry.members)
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
  @Column()
  ministryId: string;

  @ManyToOne(() => ChurchPerson, (member) => member.ministries)
  @JoinColumn({ name: 'memberId' })
  member: ChurchPerson;

  @Column()
  memberId: string;

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
