import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeadStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  RESPONDED = 'responded',
  REJECTED = 'rejected',
  CLIENT = 'client',
}

export enum LeadSource {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  RECOMMENDATION = 'recommendation',
  OTHER = 'other',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 150 })
  email: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.OTHER,
  })
  source: LeadSource;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.PENDING,
  })
  status: LeadStatus;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
