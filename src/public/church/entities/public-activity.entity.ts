import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ChurchPublicProfile } from './church_public_profile.entity';
import { ActivityStatus, ActivityVisibility, PublicActivityType } from '../enums/church_public.enum';
import { Person } from 'src/core/users/entities/person.entity';

@Entity('public_activities')
export class PublicActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChurchPublicProfile, (profile) => profile.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: ChurchPublicProfile;
  @Column()
  profileId: string;

  // relacion menytoine con person, encargado de la actividad 
  @ManyToOne(() => Person, (person) => person.publicActivities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsible_person_id' })
  responsiblePerson: Person;
  @Column()
  responsiblePersonId: string;

  @Column({ type: 'enum', enum: PublicActivityType, default: PublicActivityType.WORKSHOP })
  type: PublicActivityType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ActivityStatus, default: ActivityStatus.DRAFT })
  status: ActivityStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date;

  @Column({ type: 'numeric', nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', nullable: true })
  longitude: number | null;

  @Column({ type: 'enum', enum: ActivityVisibility, default: ActivityVisibility.PUBLIC })
  visibility: ActivityVisibility;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
