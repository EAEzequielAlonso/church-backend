import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MissionNeedStatus, MissionNeedType } from '../enums/missions.enums';
import { MissionProject } from './mission-project.entity';

@Entity('mission_needs')
export class MissionNeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: MissionNeedType,
  })
  type: MissionNeedType;

  @Column({
    type: 'enum',
    enum: MissionNeedStatus,
    default: MissionNeedStatus.OPEN,
  })
  status: MissionNeedStatus;

  // ─── Trazabilidad ──────────────────────────────────
  @Column()
  createdByPersonId: string;

  // ─── Relaciones ────────────────────────────────────
  @ManyToOne(() => MissionProject, (mission) => mission.needs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionProjectId' })
  missionProject: MissionProject;

  @Column()
  missionProjectId: string;

  // ─── Timestamps ───────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
