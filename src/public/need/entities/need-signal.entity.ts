import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { NeedLocation } from './need-location.entity';
import {
  NeedSignalStatus,
  NeedSignalCloseReason,
} from 'src/public/enums/public.enums';

@Entity('need_signals')
export class NeedSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  personId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'uuid' })
  needLocationId: string;

  @ManyToOne(() => NeedLocation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'needLocationId' })
  needLocation: NeedLocation;

  @Column({
    type: 'enum',
    enum: NeedSignalStatus,
    default: NeedSignalStatus.OPEN,
  })
  status: NeedSignalStatus;

  @Column({
    type: 'enum',
    enum: NeedSignalCloseReason,
    nullable: true,
  })
  closeReason: NeedSignalCloseReason;

  @Column({ type: 'int', default: 1 })
  impactedPeopleCount: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  // Opt-in contact info
  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  contactUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
