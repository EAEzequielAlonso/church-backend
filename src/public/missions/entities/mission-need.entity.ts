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
import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';

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

  // ─── Resolución ────────────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  fulfilledByChurchId: string;

  @ManyToOne(() => Church, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fulfilledByChurchId' })
  fulfilledByChurch: Church;

  @Column({ type: 'uuid', nullable: true })
  fulfilledByPersonId: string;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fulfilledByPersonId' })
  fulfilledByPerson: Person;

  @Column({ type: 'timestamp', nullable: true })
  fulfilledAt: Date;

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
