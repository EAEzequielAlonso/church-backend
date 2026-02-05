import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { SmallGroupMember } from './small-group-member.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { SmallGroupGuest } from './small-group-guest.entity';
import { SmallGroupStatus } from '../../common/enums';

@Entity('small_groups')
export class SmallGroup {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    objective: string;

    @Column({ nullable: true })
    studyMaterial: string;

    @Column({ nullable: true })
    currentTopic: string;

    @Column({ nullable: true })
    meetingDay: string; // e.g., "Viernes"

    @Column({ nullable: true })
    meetingTime: string; // e.g., "20:00"

    @Column({ nullable: true })
    address: string; // Default location

    @Column({ default: false })
    openEnrollment: boolean;

    @Index()
    @Column({
        type: 'enum',
        enum: SmallGroupStatus,
        default: SmallGroupStatus.ACTIVE
    })
    status: SmallGroupStatus;

    @Index()
    @ManyToOne(() => Church, (church) => church.smallGroups)
    church: Church;

    @OneToMany(() => SmallGroupMember, (member) => member.group)
    members: SmallGroupMember[];

    @OneToMany(() => SmallGroupGuest, (guest) => guest.group)
    guests: SmallGroupGuest[];

    @OneToMany(() => CalendarEvent, (event) => event.smallGroup)
    events: CalendarEvent[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
