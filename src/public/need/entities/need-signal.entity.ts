import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { NeedLocation } from './need-location.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

@Entity('need_signals')
@Index(['personId', 'status'])
export class NeedSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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
