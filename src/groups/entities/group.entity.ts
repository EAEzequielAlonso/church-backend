import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { GroupType, GroupVisibility } from '../enums/group.enums';
import { GroupParticipant } from './group-participant.entity';
import { GroupMeeting } from './group-meeting.entity';

@Entity('groups')
@Index(['churchId', 'type'])
@Index(['churchId', 'visibility'])
export class Group {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    objective: string;

    @Column({ type: 'boolean', default: false })
    hasStudyMaterial: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    studyMaterial: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    schedule: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address: string;

    @Column({
        type: 'enum',
        enum: GroupType,
        default: GroupType.SMALL_GROUP
    })
    type: GroupType;

    @Column({
        type: 'enum',
        enum: GroupVisibility,
        default: GroupVisibility.PUBLIC
    })
    visibility: GroupVisibility;

    @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
    church: Church;

    @Column({ nullable: false })
    churchId: string;

    @OneToMany(() => GroupParticipant, participant => participant.group)
    participants: GroupParticipant[];

    @OneToMany(() => GroupMeeting, meeting => meeting.group)
    meetings: GroupMeeting[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
