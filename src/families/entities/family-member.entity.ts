import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { Family } from './family.entity';
import { FamilyRole } from '../../common/enums';

@Entity('family_members')
@Index(['familyId', 'memberId'], { unique: true })
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  memberId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: ChurchPerson;

  @Column({ nullable: false })
  familyId: string;

  @ManyToOne(() => Family, (family) => family.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column({
    type: 'enum',
    enum: FamilyRole,
    default: FamilyRole.CHILD,
  })
  role: FamilyRole;

  @CreateDateColumn()
  joinedAt: Date;
}
