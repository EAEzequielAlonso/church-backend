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
import { SectionType } from '../enums/section-type.enum';

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

  @Column({ type: 'varchar' })
  type: SectionType;

  @Column()
  templateId: string;

  @ManyToOne(() => ServiceTemplate, (template) => template.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template: ServiceTemplate;


  // Assigned Ministry for this section
  @Column()
  ministryId: string;

  @ManyToOne(() => Ministry)
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
}
