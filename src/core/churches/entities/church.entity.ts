import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity'; 
import { MissionProject } from 'src/public/missions/entities/mission-project.entity';
import { MissionCollaboration } from 'src/public/missions/entities/mission-collaboration.entity';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';
import { SmallGroup } from 'src/public/small-groups/entities/small-group.entity';

/**
 * ═══════════════════════════════════════════════════
 *  Church — Canonical Ecosystem Root
 * ═══════════════════════════════════════════════════
 *
 *  The single, long-lived identity node for a church
 *  in the Telyon ecosystem.
 *
 *  This entity is NOT just an ERP tenant.
 *  It is the root identity that links:
 *   - ChurchPublicProfile  (network/discovery layer)
 *   - ChurchWorkspace      (ERP capability layer)
 */
@Entity('churches')
export class Church {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Canonical Identity ──────────────────────────
  @Column({ name: 'name' }) // Keeps DB column as name for now, but mapped as canonicalName
  canonicalName: string;

  // ─── Trazabilidad Missions ───────────────────────
  @ManyToOne(() => MissionProject, project => project.resultingChurches, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originMissionId' })
  originMission: MissionProject;

  @Column({ nullable: true })
  originMissionId: string;

  // ─── Capability Layer References ─────────────────

  @OneToOne(() => ChurchPublicProfile, (profile) => profile.church)
  publicProfile: ChurchPublicProfile;

  @OneToMany(() => MissionProject, mission => mission.creatorChurch)
  createdMissionProjects: MissionProject[];

  @OneToMany(() => MissionCollaboration, collaboration => collaboration.church)
  missionCollaborations: MissionCollaboration[];

    @OneToMany(() => PublicChurchRelation, (relation) => relation.church)
    relations: PublicChurchRelation[];

  @OneToMany(() => SmallGroup, (group) => group.church)
  smallGroups: SmallGroup[];

  // ─── Timestamps ──────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
