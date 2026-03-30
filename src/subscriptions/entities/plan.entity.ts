import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // FREE, BASIC, PRO

  @Column({ nullable: true })
  description: string;

  @Column('int', { nullable: true })
  churchPersonLimit: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ default: 'MONTHLY' })
  interval: string; // MONTHLY, YEARLY

  @Column({ name: 'mercadopago_id', nullable: true })
  mercadopagoId: string; // preapproval_plan_id from MP

  @Column('simple-json', { nullable: true })
  features: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRecommended: boolean;

  @Column({ default: false })
  isCustom: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @OneToMany(() => Subscription, (sub) => sub.plan)
  subscriptions: Subscription[];
}
