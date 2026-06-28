import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from '../../../core/users/entities/person.entity';
import { Church } from '../../../core/churches/entities/church.entity';
import { EcosystemHistoryEvent } from '../../enums/public.enums';

/**
 * ═══════════════════════════════════════════════════
 *  EcosystemHistory
 * ═══════════════════════════════════════════════════
 *
 *  Minimal history tracking for ecosystem relationships.
 *  Used to preserve events such as member/visitor assignments
 *  and claims.
 */
@Entity('ecosystem_history')
@Index(['personId', 'eventType'])
@Index(['churchId', 'eventType'])
export class EcosystemHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'uuid' })
  churchId: string;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ type: 'enum', enum: EcosystemHistoryEvent })
  eventType: EcosystemHistoryEvent;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
