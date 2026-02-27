import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { CareProcess } from './care-process.entity';
import { ChurchPerson as Member } from '../../members/entities/church-person.entity';
import { CareParticipantRole } from '../../common/enums';

@Entity('care_participants')
export class CareParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CareProcess, (process) => process.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'process_id' })
    process: CareProcess;

    @ManyToOne(() => Member, { nullable: false, eager: true })
    @JoinColumn({ name: 'member_id' })
    member: Member;

    @Column({
        type: 'enum',
        enum: CareParticipantRole
    })
    role: CareParticipantRole;

    @Column({ default: false })
    accepted: boolean; // For COUNSELEE in FORMAL processes

    @Column({ type: 'timestamp', nullable: true })
    acceptedAt: Date;

    @CreateDateColumn()
    joinedAt: Date;
}
