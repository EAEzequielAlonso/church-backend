import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { NeedLocation } from './need-location.entity';
import { UnreachedAreaStatus } from '../enums/need-signals.enum';

@Entity('unreached_areas')
@Index(['needLocationId'])
@Index(['reporterPersonId'])
@Index(['status'])
export class UnreachedArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reporterPersonId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterPersonId' })
  reporterPerson: Person;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'uuid' })
  needLocationId: string;

  @ManyToOne(() => NeedLocation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'needLocationId' })
  needLocation: NeedLocation;

  @Column({
    nullable: true,
  })
  population: number;

  @Column({
    nullable: true,
  })
  language: string;

  @Column({
    nullable: true,
  })
  ethnicity: string;

  @Column({
    nullable: true,
  })
  religion: string;

  @Column({
    default: false,
  })
  bibleAvailable: boolean;

  @Column({
    default: false,
  })
  churchKnown: boolean;

  @Column({
    default: false,
  })
  hostileEnvironment: boolean;

  @Column({
    default: false,
  })
  governmentRestrictions: boolean;

  @Column({
    default: false,
  })
  difficultAccess: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  missionaryNotes: string;

  @Column({
    type: 'enum',
    enum: UnreachedAreaStatus,
    default: UnreachedAreaStatus.OPEN,
  })
  status: UnreachedAreaStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
