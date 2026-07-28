import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Person } from 'src/core/users/entities/person.entity';
import { NeedLocation } from './need-location.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

@Entity('church_need_signals')
@Index(['needLocationId'], { unique: true })
export class ChurchNeedSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  personId: string;

  @ManyToOne(() => Person, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column()
  needLocationId: string;

  @ManyToOne(() => NeedLocation, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'needLocationId' })
  needLocation: NeedLocation;

  @Column({
    type: 'text',
    nullable: true,
  })
  observation: string;

  @Column({
    default: false,
  })
  personallyVerified: boolean;

  @Column({
    type: 'enum',
    enum: NeedSignalStatus,
    default: NeedSignalStatus.OPEN,
  })
  status: NeedSignalStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
