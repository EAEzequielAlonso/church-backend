import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { DayOfWeek } from '../../enums/public.enums';
import { ChurchPublicProfile } from './church_public_profile.entity';

@Entity('public_service_schedules')
export class PublicServiceSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  profileId: string;

  @ManyToOne(() => ChurchPublicProfile, (profile) => profile.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: ChurchPublicProfile;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'varchar' })
  startTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
