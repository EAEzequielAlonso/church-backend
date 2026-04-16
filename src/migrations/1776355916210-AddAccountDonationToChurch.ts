import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountDonationToChurch1776355916210 implements MigrationInterface {
    name = 'AddAccountDonationToChurch1776355916210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "churches" ADD "accountDonation" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "churches" DROP COLUMN "accountDonation"`);
    }

}
