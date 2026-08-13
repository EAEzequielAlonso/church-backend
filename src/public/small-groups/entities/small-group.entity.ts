import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionProject } from 'src/public/missions/entities/mission-project.entity';
import { GeoPrecision } from 'src/public/ecosystem/enums/ecosystem.enums';
import {
  SmallGroupStatus,
  GroupCapacityStatus,
} from '../enums/small-groups.enums';
import { MeetingFrequency, DayOfWeek } from '../../../shared/enums/meetings.enums';

@Entity('small_groups')
@Index(['churchId'])
@Index(['status'])
@Index(['originMissionId'])
@Index(['city'])
@Index(['state'])
export class SmallGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Relaciones Base ────────────────────────────────
  @ManyToOne(() => Church, (church) => church.smallGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'churchId' })
  church: Church;
  @Column()
  churchId: string;

  @ManyToOne(() => Person, (person) => person.ledSmallGroups, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'leaderId' })
  leader: Person;
  @Column()
  leaderId: string;

  @ManyToOne(() => MissionProject, (mission) => mission.resultingSmallGroups, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'originMissionId' })
  originMission: MissionProject;
  @Column({ nullable: true })
  originMissionId: string;

  // ─── Datos Generales ────────────────────────────────
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SmallGroupStatus,
    default: SmallGroupStatus.ACTIVE,
  })
  status: SmallGroupStatus;

  @Column({
    type: 'enum',
    enum: GroupCapacityStatus,
    default: GroupCapacityStatus.AVAILABLE,
  })
  capacityStatus: GroupCapacityStatus;

  // ─── Reuniones (Iteración y Logística) ──────────────
  @Column({ type: 'enum', enum: DayOfWeek })
  meetingDay: DayOfWeek;

  @Column()
  meetingTime: string; // Formato HH:MM

  @Column({ type: 'enum', enum: MeetingFrequency })
  meetingFrequency: MeetingFrequency;

  // ─── Contacto ───────────────────────────────────────
  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactUrl: string;

  @Column({ nullable: true })
  contactWhatsapp: string;

  // ─── Ubicación (Estándar Eclesial) ──────────────────
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

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'enum', enum: GeoPrecision, default: GeoPrecision.UNKNOWN })
  geoPrecision: GeoPrecision;

  // ─── Auditoría ──────────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date; // Usamos soft delete para el ciclo normal, y delete para borrado fuerte.
}
