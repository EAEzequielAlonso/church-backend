import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { ChurchNeedSignal } from './church-need-signal.entity';

@Entity('church_need_signal_supports')
@Index(['churchNeedSignalId', 'personId'], { unique: true })
@Index(['personId'])
export class ChurchNeedSignalSupport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  churchNeedSignalId: string;

  @ManyToOne(() => ChurchNeedSignal, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchNeedSignalId' })
  churchNeedSignal: ChurchNeedSignal;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @CreateDateColumn()
  createdAt: Date;
}
