import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { PrayerRequest } from './prayer-request.entity';

@Entity('prayer_updates')
@Index(['requestId'])
export class PrayerUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requestId: string;

  @ManyToOne(() => PrayerRequest, (request) => request.updates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requestId' })
  request: PrayerRequest;

  @Column('text')
  content: string; // "Prayed for this", "God answered", etc.

  @CreateDateColumn()
  createdAt: Date;
}
