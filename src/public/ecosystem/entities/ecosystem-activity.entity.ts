import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EcosystemActivityType, EcosystemActivityEntityType } from '../enums/ecosystem.enums';
import { Person } from '../../../core/users/entities/person.entity';
import { Church } from '../../../core/churches/entities/church.entity';

@Entity('ecosystem_activities')
@Index('idx_activity_global', ['createdAt'])
@Index('idx_activity_actor', ['actorPersonId', 'createdAt'])
@Index('idx_activity_church', ['relatedChurchId', 'createdAt'])
@Index('idx_activity_geo', ['country', 'state', 'city', 'createdAt'])
@Index('idx_activity_missionary', ['entityType', 'createdAt'])
export class EcosystemActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- ACTOR ---
  @Column({ name: 'actor_person_id', type: 'uuid' })
  actorPersonId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_person_id' })
  actorPerson: Person;

  @Column({ name: 'actor_church_id', type: 'uuid', nullable: true })
  actorChurchId?: string;

  @ManyToOne(() => Church, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_church_id' })
  actorChurch: Church;

  // --- RELACIÓN CONTEXTUAL CON IGLESIA ---
  @Column({ name: 'related_church_id', type: 'uuid', nullable: true })
  relatedChurchId?: string;

  @ManyToOne(() => Church, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_church_id' })
  relatedChurch: Church;

  // --- ACTIVIDAD ---
  @Column({ name: 'activity_type', type: 'varchar', length: 50 })
  activityType: EcosystemActivityType;

  // --- ENTIDAD DESTINO (Polimórfica) ---
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: EcosystemActivityEntityType;

  // --- UBICACIÓN (Desnormalizada para filtros) ---
  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  // --- METADATA (JSONB) ---
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // --- TIEMPO ---
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
