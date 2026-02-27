import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DiscipleshipMeeting } from './discipleship-meeting.entity';
import { DiscipleshipTaskStatus } from '../../common/enums';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Entity('discipleship_tasks')
export class DiscipleshipTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => DiscipleshipMeeting, (meeting) => meeting.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'meeting_id' })
    meeting: DiscipleshipMeeting;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    discipleResponse: string;

    @Column({ type: 'text', nullable: true })
    disciplerFeedback: string;

    @ManyToOne(() => ChurchPerson, { nullable: true })
    @JoinColumn({ name: 'assigned_to_id' })
    assignedTo: ChurchPerson;

    @Column({
        type: 'enum',
        enum: DiscipleshipTaskStatus,
        default: DiscipleshipTaskStatus.PENDING
    })
    status: DiscipleshipTaskStatus;

    @Column({ type: 'date', nullable: true })
    dueDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
