import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { DiscipleshipStatus } from '../../common/enums';
import { DiscipleshipParticipant } from './discipleship-participant.entity';
import { DiscipleshipMeeting } from './discipleship-meeting.entity';
import { DiscipleshipNote } from './discipleship-note.entity';

@Entity('discipleships')
export class Discipleship {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, { nullable: false })
    @JoinColumn({ name: 'church_id' })
    church: Church;

    @Column({ nullable: true })
    name: string; // Optional, e.g. "Discipulado Juan-Pedro"

    @Column({ type: 'text', nullable: true })
    objective: string;

    @Column({ type: 'text', nullable: true })
    studyMaterial: string;

    @Column({
        type: 'enum',
        enum: DiscipleshipStatus,
        default: DiscipleshipStatus.ACTIVE
    })
    status: DiscipleshipStatus;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date;

    @ManyToOne(() => ChurchPerson, { nullable: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: ChurchPerson; // The supervisor/admin who created it

    @OneToMany(() => DiscipleshipParticipant, (participant) => participant.discipleship, { cascade: true })
    participants: DiscipleshipParticipant[];

    @OneToMany(() => DiscipleshipMeeting, (meeting) => meeting.discipleship)
    meetings: DiscipleshipMeeting[];

    @OneToMany(() => DiscipleshipNote, (note) => note.discipleship)
    notes: DiscipleshipNote[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
