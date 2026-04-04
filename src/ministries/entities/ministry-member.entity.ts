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
import { Unique } from 'typeorm';

@Entity('ministry_members')
@Unique(['ministryId', 'memberId'])
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



  @CreateDateColumn()
  joinedAt: Date;
}
