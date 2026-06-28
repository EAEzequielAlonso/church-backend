import { Person } from 'src/core/users/entities/person.entity';
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
import { MissionReportCategory } from '../enums/missions.enums';
import { MissionProject } from './mission-project.entity';

@Entity('mission_reports')
@Index(['missionProjectId', 'createdAt'])
export class MissionReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Relaciones ────────────────────────────────────
  @ManyToOne(() => MissionProject, (mission) => mission.reports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionProjectId' })
  missionProject: MissionProject;

  @Column()
  missionProjectId: string;

  @ManyToOne(() => Person, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authorPersonId' })
  author: Person;

  @Column({ nullable: true })
  authorPersonId: string;

  // ─── Contenido ─────────────────────────────────────
  @Column({
    type: 'enum',
    enum: MissionReportCategory,
  })
  category: MissionReportCategory;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'text', array: true, default: [] })
  attachments: string[];

  // ─── Visibilidad ───────────────────────────────────
  @Column({ default: true })
  isPublic: boolean;

  // ─── Timestamps ───────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
