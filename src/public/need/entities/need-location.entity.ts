import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('need_locations')
@Index(['country', 'state', 'city'], { unique: true })
export class NeedLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  country: string;

  @Column({ nullable: false })
  state: string;

  @Column({ nullable: false })
  city: string;

  @Column({ type: 'numeric', nullable: false })
  latitude: number;

  @Column({ type: 'numeric', nullable: false })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
