import { Church } from "src/core/churches/entities/church.entity";
import { EcclesialRole, PublicChurchRelationStatus, PublicChurchRelationType } from "src/public/enums/public.enums";
import { Person } from "src/core/users/entities/person.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";


@Entity('public_church_relations')
@Index(['churchId', 'personId'], { unique: true })
export class PublicChurchRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  churchId: string | null;

  @ManyToOne(() => Church, (church) => church.relations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'churchId' })
  church: Church | null;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person | null;

  @Column({
    type: 'enum',
    enum: PublicChurchRelationType,
    default: PublicChurchRelationType.REGULAR_VISITOR,
  })
  relationType: PublicChurchRelationType;

  @Column({
    type: 'enum',
    enum: PublicChurchRelationStatus,
    default: PublicChurchRelationStatus.PENDING,
  })
  status: PublicChurchRelationStatus;

  @Column({ type: 'boolean' })
  isCurrentAdmin: boolean;

  @Column({
    type: 'enum',
    enum: EcclesialRole,
    default: EcclesialRole.NONE,
  })
  ecclesialRole: EcclesialRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}