import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeadsTable1776769090238 implements MigrationInterface {
    name = 'CreateLeadsTable1776769090238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."leads_source_enum" AS ENUM('google', 'facebook', 'instagram', 'recommendation', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."leads_status_enum" AS ENUM('pending', 'contacted', 'responded', 'rejected', 'client')`);
        await queryRunner.query(`CREATE TABLE "leads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "church" character varying(150) NOT NULL, "role" character varying(100), "email" character varying(150) NOT NULL, "country" character varying(100) NOT NULL, "state" character varying(100), "phone" character varying(30), "source" "public"."leads_source_enum" NOT NULL DEFAULT 'other', "message" text, "status" "public"."leads_status_enum" NOT NULL DEFAULT 'pending', "isDeleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "leads"`);
        await queryRunner.query(`DROP TYPE "public"."leads_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leads_source_enum"`);
    }

}
