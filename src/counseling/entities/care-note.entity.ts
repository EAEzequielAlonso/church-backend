import { CareSession } from './care-session.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CareProcess } from './care-process.entity';
import { ChurchPerson as Member } from '../../members/entities/church-person.entity';
import { CareNoteVisibility } from '../../common/enums';

@Entity('care_notes')
export class CareNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CareProcess, (process) => process.notes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'process_id' })
    process: CareProcess;

    @ManyToOne(() => CareSession, (session) => session.notes, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'session_id' })
    session: CareSession;

    @ManyToOne(() => Member, { nullable: false })
    @JoinColumn({ name: 'author_id' })
    author: Member;

    @Column({ type: 'text', nullable: true })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: CareNoteVisibility,
        default: CareNoteVisibility.PERSONAL
    })
    visibility: CareNoteVisibility;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
