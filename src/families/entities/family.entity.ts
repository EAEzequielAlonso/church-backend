import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { FamilyMember } from './family-member.entity';

@Entity('families')
@Index(['churchId'])
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Familia Pérez"

  @Column()
  churchId: string;

  @ManyToOne(() => Church, (church) => church.families)
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @OneToMany(() => FamilyMember, (member) => member.family)
  members: FamilyMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
