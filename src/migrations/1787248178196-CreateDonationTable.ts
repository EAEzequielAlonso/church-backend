import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDonationTable1787248178196 implements MigrationInterface {
  name = 'CreateDonationTable1787248178196';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "donations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "amount" numeric(10,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "externalPaymentId" character varying,
        "userId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_donations_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_user_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "donations"`);
  }
}
