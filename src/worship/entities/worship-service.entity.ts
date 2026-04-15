import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ServiceTemplate } from './service-template.entity';
import { ServiceSection } from './service-section.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

export enum ServiceStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
}

@Entity('worship_services')
@Index(['churchId', 'date'])
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

  @Column()
  churchId: string;

  @ManyToOne(() => Church, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => ServiceTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: ServiceTemplate;

  @OneToMany(() => ServiceSection, (section) => section.service, {
    cascade: true,
  })
  sections: ServiceSection[];

  @Column({ nullable: true })
  calendarEventId: string;

  @OneToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendarEventId' })
  calendarEvent: CalendarEvent;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
