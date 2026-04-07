import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { WorshipService } from './worship-service.entity';
import { ServiceDuty } from '../../ministries/entities/service-duty.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { SectionType } from '../enums/section-type.enum';

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

  @Column({ type: 'varchar'})
  type: SectionType;

  @Column({ nullable: true })
  startTime: string; // HH:mm (calculated or fixed)

  @Column({ type: 'text', nullable: true })
  content: string; // Song list, Sermon text ref, etc.

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column()
  serviceId: string;

  @ManyToOne(() => WorshipService, (service) => service.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceId' })
  service: WorshipService;


  // Manual Overrides: Map RoleID -> PersonID
  @Column({ type: 'simple-json', nullable: true })
  overrides: Record<string, string>;

  @Column({ nullable: true })
  ministryId: string;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
}
