import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Church } from '../../churches/entities/church.entity';

export enum DonationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('donations')
@Index(['churchId'])
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.PENDING,
  })
  status: DonationStatus;

  @Column({ default: 'MERCADOPAGO' })
  provider: string;

  @Column({ nullable: true })
  externalReference: string; // MP Preference ID or Payment ID

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  churchId: string;

  @ManyToOne(() => Church, { nullable: true })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @CreateDateColumn()
  createdAt: Date;
}
