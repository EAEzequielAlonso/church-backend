import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyLeads1777375926804 implements MigrationInterface {
    name = 'SimplifyLeads1777375926804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "church"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "message"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ADD "message" text`);
        await queryRunner.query(`ALTER TABLE "leads" ADD "state" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "leads" ADD "country" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leads" ADD "role" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "leads" ADD "church" character varying(150) NOT NULL`);
    }

}
