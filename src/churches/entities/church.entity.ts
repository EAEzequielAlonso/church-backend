import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { PlanType, SubscriptionStatus } from '../../common/enums';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TreasuryTransaction } from '../../treasury/entities/treasury-transaction.entity';
import { Group } from '../../groups/entities/group.entity';
import { Family } from '../../families/entities/family.entity';
import { Account } from '../../treasury/entities/account.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Currency } from '../../treasury/enums/treasury.enums';

@Entity('churches')
export class Church {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
  baseCurrency: Currency;

  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  coverUrl: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ type: 'enum', enum: PlanType, default: PlanType.TRIAL })
  plan: PlanType;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({ default: 'America/Argentina/Buenos_Aires' })
  timezone: string;

  @Column({ nullable: true })
  trialEndsAt: Date;

  @OneToMany(() => ChurchPerson, (member) => member.church)
  members: ChurchPerson[];

  @OneToMany(() => Ministry, (ministry) => ministry.church)
  ministries: Ministry[];

  @OneToMany(() => TreasuryTransaction, (tx) => tx.church)
  transactions: TreasuryTransaction[];

  @OneToMany(() => Group, (group) => group.church)
  groups: Group[];

  @OneToMany(() => Family, (family) => family.church)
  families: Family[];

  @OneToMany(() => Account, (acc) => acc.church)
  accounts: Account[];

  @OneToMany(() => Subscription, (sub) => sub.church)
  subscriptions: Subscription[];
}
