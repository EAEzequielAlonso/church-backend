import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { Family } from './family.entity';
import { FamilyRole } from '../../common/enums';

@Entity('family_members')
@Index(['family', 'member'], { unique: true })
export class FamilyMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
    member: ChurchPerson;

    @Index()
    @ManyToOne(() => Family, (family) => family.members, { nullable: false, onDelete: 'CASCADE' })
    family: Family;

    @Index()
    @Column({
        type: 'enum',
        enum: FamilyRole,
        default: FamilyRole.CHILD
    })
    role: FamilyRole;

    @CreateDateColumn()
    joinedAt: Date;
}
