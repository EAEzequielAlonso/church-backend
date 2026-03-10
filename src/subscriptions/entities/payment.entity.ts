import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subscriptionId: string;

  @ManyToOne(() => Subscription, (sub) => sub.payments)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string; // approved, rejected, pending

  @Column({ name: 'external_id' })
  externalId: string; // MP payment id

  @CreateDateColumn()
  date: Date;
}
