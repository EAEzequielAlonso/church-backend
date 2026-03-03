import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { PrayerRequest } from './prayer-request.entity';

@Entity('prayer_updates')
export class PrayerUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrayerRequest, (request) => request.updates, {
    onDelete: 'CASCADE',
  })
  request: PrayerRequest;

  @Column('text')
  content: string; // "Prayed for this", "God answered", etc.

  @CreateDateColumn()
  createdAt: Date;
}
