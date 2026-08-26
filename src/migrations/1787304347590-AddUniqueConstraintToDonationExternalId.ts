import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToDonationExternalId1787304347590 implements MigrationInterface {
  name = 'AddUniqueConstraintToDonationExternalId1787304347590';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "UQ_donations_external_payment_id" UNIQUE ("externalPaymentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "UQ_donations_external_payment_id"`,
    );
  }
}
