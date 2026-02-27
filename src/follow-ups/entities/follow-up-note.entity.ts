import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { FollowUp } from './follow-up.entity';
import { FollowUpNoteType } from '../enums/follow-up-note-type.enum';
import { Person } from '../../users/entities/person.entity';

@Entity('follow_up_notes')
@Index(['churchId', 'followupId', 'createdAt'])
@Index(['churchId', 'authorPersonId'])
export class FollowUpNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    churchId: string;

    @ManyToOne(() => FollowUp, followup => followup.notes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followupId' })
    followup: FollowUp;

    @Column()
    followupId: string;

    @ManyToOne(() => Person)
    @JoinColumn({ name: 'authorPersonId' })
    author: Person;

    @Column()
    authorPersonId: string;

    @Column({
        type: 'enum',
        enum: FollowUpNoteType,
        default: FollowUpNoteType.INTERNAL
    })
    type: FollowUpNoteType;

    @Column('text')
    text: string;

    @CreateDateColumn()
    createdAt: Date;
}
