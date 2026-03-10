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

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ nullable: true })
  serviceType: string; // Optional: "SUNDAY_MORNING", "YOUTH", etc.

  @Column({ type: 'simple-json', nullable: true })
  metadata: any; // Flexible JSON for behavior-specific data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
