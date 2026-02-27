import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Discipleship } from './discipleship.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { DiscipleshipRole } from '../../common/enums';

@Entity('discipleship_participants')
export class DiscipleshipParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Discipleship, (discipleship) => discipleship.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discipleship_id' })
    discipleship: Discipleship;

    @ManyToOne(() => ChurchPerson, { nullable: false, eager: true })
    @JoinColumn({ name: 'member_id' })
    member: ChurchPerson;

    @Column({
        type: 'enum',
        enum: DiscipleshipRole
    })
    role: DiscipleshipRole;

    @CreateDateColumn()
    joinedAt: Date;
}
