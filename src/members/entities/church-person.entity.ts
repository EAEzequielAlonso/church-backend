import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Person } from '../../users/entities/person.entity';
import { Church } from '../../churches/entities/church.entity';
import { MembershipStatus } from '../enums/membership-status.enum';
import { EcclesiasticalRole, FunctionalRole } from '../../common/enums';
import { MinistryMember } from '../../ministries/entities/ministry-member.entity';

@Entity('church_persons')
@Unique(['churchId', 'personId'])
@Index(['churchId', 'membershipStatus'])
@Index(['churchId', 'archivedAt'])
export class ChurchPerson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  churchId: string;

  @Column()
  personId: string;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @OneToMany(() => MinistryMember, (mm) => mm.member)
  ministries: MinistryMember[];

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.VISITOR,
  })
  membershipStatus: MembershipStatus;

  @Column({
    type: 'enum',
    enum: EcclesiasticalRole,
    default: EcclesiasticalRole.NONE,
  })
  ecclesiasticalRole: EcclesiasticalRole;

  @Column({
    type: 'enum',
    enum: FunctionalRole,
    array: true,
    default: [],
  })
  functionalRoles: FunctionalRole[];

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
