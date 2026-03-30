import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Plan } from './plan.entity';
import { Payment } from './payment.entity';
import { SubscriptionStatus } from '../../common/enums';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  churchId: string;

  @ManyToOne(() => Church)
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column()
  planId: string;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions, { eager: true })
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Column({ name: 'mercadopago_id', nullable: true })
  mercadopagoId: string;

  @Column({ nullable: true })
  preapprovalId: string;

  @Column({ nullable: true })
  payerEmail: string;

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date; // Null if active auto-renew

  @Column({ type: 'timestamptz', nullable: true })
  nextPaymentDate: Date;

  @OneToMany(() => Payment, (payment) => payment.subscription)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
