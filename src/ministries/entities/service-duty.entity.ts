import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { MinistryRoleAssignment } from './ministry-role-assignment.entity';

import { ServiceDutyBehavior } from '../enums/service-duty-behavior.enum';

@Entity('service_duties')
export class ServiceDuty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Predicación", "Audio", "Ujier"

  @Column({
    type: 'enum',
    enum: ServiceDutyBehavior,
    default: ServiceDutyBehavior.STANDARD,
  })
  behaviorType: ServiceDutyBehavior;

  @ManyToOne(() => Ministry, (ministry) => ministry.serviceDuties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
  @Column()
  ministryId: string;

  @OneToMany(() => MinistryRoleAssignment, (assignment) => assignment.role)
  assignments: MinistryRoleAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
