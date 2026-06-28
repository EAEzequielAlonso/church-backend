import { Church } from 'src/core/churches/entities/church.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MissionProject } from './mission-project.entity';
import { MissionCollaborationStatus } from '../enums/missions.enums';

@Entity('mission_collaborations')
@Index(['missionProjectId', 'churchId'], { unique: true })
export class MissionCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MissionProject, (mission) => mission.collaborations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionProjectId' })
  missionProject: MissionProject;

  @Column()
  missionProjectId: string;

  @ManyToOne(() => Church, (church) => church.missionCollaborations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column()
  churchId: string;

  // ─── Estado ───────────────────────────────────────
  @Column({
    type: 'enum',
    enum: MissionCollaborationStatus,
    default: MissionCollaborationStatus.PENDING,
  })
  status: MissionCollaborationStatus;

  // ─── Compromisos ──────────────────────────────────
  @Column({ default: false })
  prayerSupport: boolean;

  @Column({ default: false })
  financialSupport: boolean;

  @Column({ default: false })
  volunteerSupport: boolean;

  @Column({ default: false })
  materialSupport: boolean;

  @Column({ default: false })
  logisticSupport: boolean;

  // ─── Comentario Opcional ──────────────────────────
  @Column({ type: 'text', nullable: true })
  notes: string;

  // ─── Timestamps ───────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
