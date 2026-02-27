import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { FollowUpStatus } from '../../common/enums';
import { FollowUpNote } from './follow-up-note.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Entity('follow_ups')
@Index(['churchId', 'status'])
@Index(['churchId', 'assignedToId', 'status'])
@Index(['churchId', 'createdAt'])
@Index(['churchId', 'archivedAt'])
export class FollowUp {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date', nullable: true })
    firstVisitDate: Date;

    @Column({
        type: 'enum',
        enum: FollowUpStatus,
        default: FollowUpStatus.VISITOR
    })
    status: FollowUpStatus;

    @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @Column({ nullable: false })
    churchId: string;

    @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'churchPersonId' })
    churchPerson: ChurchPerson;

    @Column({ nullable: false })
    churchPersonId: string;

    @ManyToOne(() => ChurchPerson, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assignedToId' })
    assignedTo: ChurchPerson;

    @Column({ nullable: true })
    assignedToId: string;

    @ManyToOne(() => ChurchPerson, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdById' })
    createdBy: ChurchPerson;

    @Column({ nullable: true })
    createdById: string;

    @OneToMany(() => FollowUpNote, note => note.followup)
    notes: FollowUpNote[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    archivedAt: Date;
}
