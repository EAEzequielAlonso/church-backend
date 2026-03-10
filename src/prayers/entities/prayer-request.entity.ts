import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import {
  PrayerRequestStatus,
  PrayerRequestVisibility,
} from '../../common/enums';
import { PrayerUpdate } from './prayer-update.entity';

@Entity('prayer_requests')
@Index(['churchId', 'status'])
export class PrayerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  churchId: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column()
  memberId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false })
  @JoinColumn({ name: 'memberId' })
  member: ChurchPerson; // The person asking for prayer

  @Column('text')
  motive: string;

  @Column({
    type: 'enum',
    enum: PrayerRequestStatus,
    default: PrayerRequestStatus.WAITING,
  })
  status: PrayerRequestStatus;

  @Column({
    type: 'enum',
    enum: PrayerRequestVisibility,
    default: PrayerRequestVisibility.PRIVATE,
  })
  visibility: PrayerRequestVisibility;

  @Column('text', { nullable: true })
  testimony: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @OneToMany(() => PrayerUpdate, (update) => update.request)
  updates: PrayerUpdate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
