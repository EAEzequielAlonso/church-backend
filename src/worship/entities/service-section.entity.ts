import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { WorshipService } from './worship-service.entity';
import { ServiceDuty } from '../../ministries/entities/service-duty.entity';
import { Person } from '../../users/entities/person.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';

@Entity('service_sections')
export class ServiceSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  duration: number; // minutes

  @Column({ nullable: true })
  type: string; // "GLOBAL", "PREACHING", etc. - Critical for Timeline filtering

  @Column({ nullable: true })
  startTime: string; // HH:mm (calculated or fixed)

  @Column({ type: 'text', nullable: true })
  content: string; // Song list, Sermon text ref, etc.

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => WorshipService, (service) => service.sections, {
    onDelete: 'CASCADE',
  })
  service: WorshipService;

  // Required roles snapshot (copied from template or added manually)
  @ManyToMany(() => ServiceDuty)
  @JoinTable({ name: 'section_required_roles' })
  requiredRoles: ServiceDuty[];

  // Manual Overrides: Map RoleID -> PersonID
  // Storing as JSON for flexibility.
  // Format: { "role-uuid": "person-uuid", "role-uuid-2": "person-uuid-2" }
  @Column({ type: 'simple-json', nullable: true })
  overrides: Record<string, string>;

  @ManyToOne(() => Ministry, { nullable: true })
  ministry: Ministry;
}
