import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { FamilyMember } from './family-member.entity';

@Entity('families')
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Familia Pérez"

  @Index()
  @ManyToOne(() => Church, (church) => church.families)
  church: Church;

  @OneToMany(() => FamilyMember, (member) => member.family)
  members: FamilyMember[];

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
