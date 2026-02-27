import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { PlanType, SubscriptionStatus } from '../../common/enums';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TreasuryTransaction } from '../../treasury/entities/treasury-transaction.entity';
import { CareProcess } from '../../counseling/entities/care-process.entity';
import { Group } from '../../groups/entities/group.entity';
import { Family } from '../../families/entities/family.entity';
import { FollowUp } from '../../follow-ups/entities/follow-up.entity';
import { Account } from '../../treasury/entities/account.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('churches')
export class Church {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

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

    @Column({ type: 'enum', enum: PlanType, default: PlanType.TRIAL })
    plan: PlanType;

    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
    subscriptionStatus: SubscriptionStatus;

    @Column({ nullable: true })
    trialEndsAt: Date;

    @OneToMany(() => ChurchPerson, (member) => member.church)
    members: ChurchPerson[];

    @OneToMany(() => Ministry, (ministry) => ministry.church)
    ministries: Ministry[];

    @OneToMany(() => TreasuryTransaction, (tx) => tx.church)
    transactions: TreasuryTransaction[];

    @OneToMany(() => CareProcess, (process) => process.church)
    careProcesses: CareProcess[];

    @OneToMany(() => Group, (group) => group.church)
    groups: Group[];

    @OneToMany(() => Family, (family) => family.church)
    families: Family[];

    @OneToMany(() => FollowUp, (followUp) => followUp.church)
    followUps: FollowUp[];

    @OneToMany(() => Account, (acc) => acc.church)
    accounts: Account[];

    @OneToMany(() => Subscription, (sub) => sub.church)
    subscriptions: Subscription[];

    @OneToMany(() => CalendarEvent, (event) => event.church)
    calendarEvents: CalendarEvent[];
}
