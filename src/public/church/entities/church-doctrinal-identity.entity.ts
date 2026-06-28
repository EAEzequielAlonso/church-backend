import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';
import {
  ChurchGovernment,
  BaptismStance,
  SpiritualGiftsStance,
  EschatologyStance,
  GenderRolesStance,
  LordsSupperStance,
} from 'src/public/enums/public.enums';

@Entity('church_doctrinal_identities')
export class ChurchDoctrinalIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  profileId: string;

  @OneToOne(() => ChurchPublicProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: ChurchPublicProfile;

  // A. Doctrinas Centrales (Booleanos)
  @Column({ default: false })
  affirmsScriptureAuthority: boolean;

  @Column({ default: false })
  affirmsTrinity: boolean;

  @Column({ default: false })
  affirmsDeityOfChrist: boolean;

  @Column({ default: false })
  affirmsHumanityOfChrist: boolean;

  @Column({ default: false })
  affirmsSalvationByGrace: boolean;

  @Column({ default: false })
  affirmsBodilyResurrection: boolean;

  @Column({ default: false })
  affirmsSecondComing: boolean;

  // B. Posiciones Doctrinales (Enums)
  @Column({ type: 'enum', enum: ChurchGovernment, nullable: true })
  churchGovernment: ChurchGovernment;

  @Column({ type: 'enum', enum: BaptismStance, nullable: true })
  baptismStance: BaptismStance;

  @Column({ type: 'enum', enum: SpiritualGiftsStance, nullable: true })
  spiritualGiftsStance: SpiritualGiftsStance;

  @Column({ type: 'enum', enum: EschatologyStance, nullable: true })
  eschatologyStance: EschatologyStance;

  @Column({ type: 'enum', enum: GenderRolesStance, nullable: true })
  genderRolesStance: GenderRolesStance;

  @Column({ type: 'enum', enum: LordsSupperStance, nullable: true })
  lordsSupperStance: LordsSupperStance;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
