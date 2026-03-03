import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ServiceTemplate } from './service-template.entity';
import { ServiceSection } from './service-section.entity';

export enum ServiceStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
}

@Entity('worship_services')
export class WorshipService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true })
  topic: string; // Main topic/theme of the service

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.DRAFT,
  })
  status: ServiceStatus;

  @ManyToOne(() => Church, { onDelete: 'CASCADE' })
  church: Church;

  @ManyToOne(() => ServiceTemplate, { nullable: true, onDelete: 'SET NULL' })
  template: ServiceTemplate;

  @OneToMany(() => ServiceSection, (section) => section.service, {
    cascade: true,
  })
  sections: ServiceSection[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
