import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { GeoPrecision } from 'src/public/ecosystem/enums/ecosystem.enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  MissionOutcomeType,
  MissionProjectStatus,
  MissionSourceType,
} from '../enums/missions.enums';
import { MissionCollaboration } from './mission-collaboration.entity';
import { MissionNeed } from './mission-need.entity';
import { MissionReport } from './mission-report.entity';
import { SmallGroup } from 'src/public/small-groups/entities/small-group.entity';

@Entity('mission_projects')
export class MissionProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  summary: string;

  @Column('text')
  description: string;

  @Column({ type: 'text', nullable: true })
  vision: string;

  // ─── Ubicación (Esquema Church) ───────────────────
  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'numeric', nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', nullable: true })
  longitude: number | null;

  @Column({
    type: 'enum',
    enum: GeoPrecision,
    default: GeoPrecision.UNKNOWN,
  })
  geoPrecision: GeoPrecision;

  // ─── Relaciones de Propiedad ──────────────────────
  @ManyToOne(() => Church, (church) => church.createdMissionProjects, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creatorChurchId' })
  creatorChurch: Church;

  @Column()
  creatorChurchId: string;

  @ManyToOne(() => Person, {
    nullable: false,
    onDelete: 'RESTRICT', // No queremos que se borre si se borra el lider, quiza deba ser nullable si el lider renuncia, pero por ahora requerimos un leader.
  })
  @JoinColumn({ name: 'leaderId' })
  leader: Person;

  @Column()
  leaderId: string;

  // ─── Trazabilidad de Origen ───────────────────────
  @Column({
    type: 'enum',
    enum: MissionSourceType,
    default: MissionSourceType.MANUAL,
  })
  sourceEntityType: MissionSourceType;

  @Column({ type: 'uuid', nullable: true })
  sourceEntityId: string;

  // ─── Trazabilidad de Destino ──────────────────────
  @Column({ type: 'uuid', nullable: true })
  resultingChurchId: string;

  @Column({
    type: 'enum',
    enum: MissionOutcomeType,
    nullable: true,
  })
  outcomeType: MissionOutcomeType;

  // ─── Fechas de Avance ─────────────────────────────
  @Column({ type: 'date', nullable: true })
  plannedStartDate: Date;

  @Column({ type: 'date', nullable: true })
  actualStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // ─── Estado ───────────────────────────────────────
  @Column({
    type: 'enum',
    enum: MissionProjectStatus,
    default: MissionProjectStatus.DRAFT,
  })
  status: MissionProjectStatus;

  // ─── Colecciones ──────────────────────────────────
  @OneToMany(() => MissionCollaboration, (collaboration) => collaboration.missionProject)
  collaborations: MissionCollaboration[];

  @OneToMany(() => MissionNeed, (need) => need.missionProject)
  needs: MissionNeed[];

  @OneToMany(() => MissionReport, (report) => report.missionProject)
  reports: MissionReport[];

  @OneToMany(() => SmallGroup, (smallGroup) => smallGroup.originMission)
  resultingSmallGroups: SmallGroup[];

  @OneToMany(() => Church, (church) => church.originMission)
  resultingChurches: Church[];

  // ─── Timestamps ───────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
