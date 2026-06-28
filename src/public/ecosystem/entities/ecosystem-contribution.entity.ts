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
import { EcosystemContributionType } from '../enums/ecosystem.enums';

/**
 * ═══════════════════════════════════════════════════
 *  EcosystemContribution
 * ═══════════════════════════════════════════════════
 *
 *  Append-only event log for ecosystem impact tracking.
 *
 *  This is NOT social vanity metrics.
 *  This is Kingdom expansion impact tracking.
 *
 *  Records canonical events:
 *   - churches added to the map
 *   - claims submitted / approved
 *   - users invited / joined
 *   - ERP activations
 *   - workshops / events published
 *   - mission zones identified
 *
 *  Rules:
 *   - Append-only. No updates. No deletes.
 *   - Aggregation derives stats from this table.
 *   - Per-person: SELECT type, COUNT(*) ... GROUP BY type
 *   - Per-church: SELECT type, COUNT(*) ... GROUP BY type
 *   - Leaderboards: SELECT actorPersonId, COUNT(*) ... ORDER BY count DESC
 *
 *  Churches aggregate the contributions of their members:
 *    e.g., 3 members added 10 churches each
 *    → church ecosystem impact = 30 churches added
 */
@Entity('ecosystem_contributions')
@Index(['actorPersonId', 'type'])
@Index(['targetChurchId', 'type'])
@Index(['type', 'createdAt'])
export class EcosystemContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Who performed the action ────────────────────
  @Column()
  actorPersonId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorPersonId' })
  actorPerson: Person;

  // ─── Which church context (null = platform-level) ─
  @Column({ nullable: true })
  targetChurchId: string | null;

  @ManyToOne(() => Church, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetChurchId' })
  targetChurch: Church | null;

  // ─── Contribution Type ───────────────────────────
  @Column({ type: 'enum', enum: EcosystemContributionType })
  type: EcosystemContributionType;

  // ─── Flexible Payload ────────────────────────────
  // Examples:
  //   CHURCH_ADDED: { churchName: "...", source: "map" }
  //   CLAIM_APPROVED: { claimId: "..." }
  //   USER_INVITED: { invitedEmail: "..." }
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  // ─── Timestamp ───────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;
}
