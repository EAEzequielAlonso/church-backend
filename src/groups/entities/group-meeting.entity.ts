import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Group } from './group.entity';
import { GroupAttendance } from './group-attendance.entity';

@Entity('group_meetings')
@Index(['groupId', 'date'])
export class GroupMeeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Group, group => group.meetings, { nullable: false, onDelete: 'CASCADE' })
    group: Group;

    @Column({ nullable: false })
    groupId: string;

    @Column({ type: 'date', nullable: false })
    date: Date;

    @Column({ nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany(() => GroupAttendance, attendance => attendance.meeting)
    attendances: GroupAttendance[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
