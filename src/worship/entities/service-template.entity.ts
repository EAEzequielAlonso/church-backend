import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ServiceTemplateSection } from './service-template-section.entity';

@Entity('service_templates')
export class ServiceTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Culto Dominical", "Reunión de Jóvenes"

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Church, { onDelete: 'CASCADE' })
  church: Church;

  @OneToMany(() => ServiceTemplateSection, (section) => section.template, {
    cascade: true,
  })
  sections: ServiceTemplateSection[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
