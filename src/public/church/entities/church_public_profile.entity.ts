import { Church } from "src/core/churches/entities/church.entity";
import { GeoPrecision } from "src/public/ecosystem/enums/ecosystem.enums";
import { ChurchDoctrinalIdentity } from "src/public/church/entities/church-doctrinal-identity.entity";
import { PublicActivity } from "src/public/church/entities/public-activity.entity";
import { PublicServiceSchedule } from "src/public/church/entities/public-service-schedule.entity";
import { ChurchDenomination } from "src/public/enums/public.enums";
import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ChurchFollow } from "./follower.entity";

@Entity('church_public_profiles')
export class ChurchPublicProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ─── Church Reference (1:1) ──────────────────────
    @Column({ unique: true })
    churchId: string;

    @OneToOne(() => Church, (church) => church.publicProfile, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'churchId' })
    church: Church;

    // ─── Profile Lifecycle ───────────────────────────

    @Column({ default: false })
    isVerified: boolean;

    @Column({ type: 'enum', enum: ChurchDenomination, nullable: true })
    denomination: ChurchDenomination;

    @OneToOne(() => ChurchDoctrinalIdentity, (doc) => doc.profile)
    doctrinalIdentity: ChurchDoctrinalIdentity;


    // ─── Public Content ──────────────────────────────
    @Column({ unique: true, nullable: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    publicDescription: string;

    @Column({ type: 'text', array: true, default: [] })
    photoUrls: string[];

    // ─── Visual Identity & Contact ───────────────────
    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    coverUrl: string;

    @Column({ nullable: true })
    mainImageUrl: string;

    @Column({ nullable: true })
    contactEmail: string;

    @Column({ nullable: true })
    contactPhone: string;

    // ─── Explicit Social Links ───────────────────────
    @Column({ nullable: true })
    website: string;

    @Column({ nullable: true })
    instagram: string;

    @Column({ nullable: true })
    facebook: string;

    @Column({ nullable: true })
    youtube: string;

    // ─── Geo / Location ──────────────────────────────
    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    postalCode: string;

    @Column({ type: 'numeric', nullable: true })
    latitude: number | null;

    @Column({ type: 'numeric', nullable: true })
    longitude: number | null;

    @Column({
        type: 'enum',
        enum: GeoPrecision,
        default: GeoPrecision.UNKNOWN,
    })
    geoPrecision: GeoPrecision;

    // ─── Public Network Relations ────────────────────
    @Column({ nullable: true })
    creatorPersonId: string; //quien creo el perfil

    @Column({ nullable: true })
    claimerPersonId: string; //quien reclamo el perfil

    @Column({ nullable: true })
    isCurrentAdmin: boolean; // Es una iglesia Administrada por alguien 

    @OneToMany(() => PublicServiceSchedule, (schedule) => schedule.profile)
    schedules: PublicServiceSchedule[];

    @OneToMany(() => PublicActivity, (activity) => activity.profile)
    activities: PublicActivity[];

    // ─── Followers ───────────────────────────────────
    @OneToMany(() => ChurchFollow, (follower) => follower.profileChurch)
    followers: ChurchFollow[];

    // ─── Timestamps ──────────────────────────────────
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}