import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinTable,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { ServiceTemplate } from './service-template.entity';
import { ServiceDuty } from '../../ministries/entities/service-duty.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';

@Entity('service_template_sections')
export class ServiceTemplateSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // e.g. "Alabanza", "Predicación"

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  defaultDuration: number; // minutes

  @Column({ nullable: true })
  type: string; // "WORSHIP", "PREACHING", "WELCOME", etc.

  @Column()
  templateId: string;

  @ManyToOne(() => ServiceTemplate, (template) => template.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template: ServiceTemplate;

  // Which roles are required for this section?
  @ManyToMany(() => ServiceDuty)
  @JoinTable({ name: 'template_section_required_roles' })
  requiredRoles: ServiceDuty[];

  // NEW: Assigned Ministry for this section (e.g. "Worship", "Audiovisual")
  @Column({ nullable: true })
  ministryId: string;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
}
