import { Church } from 'src/core/churches/entities/church.entity';
import { ChurchClaimStatus } from 'src/public/enums/public.enums';
import { Person } from 'src/core/users/entities/person.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('church_claims')
@Index(['churchId', 'claimantPersonId'], {
  unique: true,
  where: "status = 'PENDING'",
})
export class ChurchClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'churchId' })
  church: Church;
  @Column({ type: 'uuid' })
  churchId: string;

  @Column({ type: 'uuid' })
  claimantPersonId: string;
  @ManyToOne(() => Person, { nullable: false })
  @JoinColumn({ name: 'claimantPersonId' })
  claimantPerson: Person;

  @Column({
    type: 'enum',
    enum: ChurchClaimStatus,
    default: ChurchClaimStatus.PENDING,
  })
  status: ChurchClaimStatus;

  @Column({ type: 'text', nullable: true })
  evidence: string | null;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
