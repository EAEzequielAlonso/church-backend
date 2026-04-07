import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { ServiceDuty } from './service-duty.entity';
import { Person } from '../../users/entities/person.entity';
import { WorshipService } from '../../worship/entities/worship-service.entity';
import { ServiceSection } from '../../worship/entities/service-section.entity';

@Entity('ministry_role_assignments')
export class MinistryRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, (ministry) => ministry.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  @Column()
  ministryId: string;

  @ManyToOne(() => ServiceDuty, (duty) => duty.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roleId' })
  role: ServiceDuty;

  @Column()
  roleId: string;

  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column()
  personId: string;

  @ManyToOne(() => WorshipService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service: WorshipService;

  @Column()
  serviceId: string;

  @ManyToOne(() => ServiceSection, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sectionId' })
  section: ServiceSection;

  @Column({ nullable: true })
  sectionId: string;

  @Column({ nullable: true })
  serviceType: string; // Optional: "SUNDAY_MORNING", "YOUTH", etc.

  @Column({ type: 'simple-json', nullable: true })
  metadata: any; // Flexible JSON for behavior-specific data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
