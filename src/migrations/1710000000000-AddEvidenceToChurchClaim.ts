import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEvidenceToChurchClaim1710000000000 implements MigrationInterface {
  name = 'AddEvidenceToChurchClaim1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "church_claims" ADD "evidence" text`);

    // Migrate existing evidence from verificationNotes if the claim is PENDING
    // This preserves the evidence that users submitted before this separation was implemented.
    await queryRunner.query(
      `UPDATE "church_claims" SET "evidence" = "verificationNotes", "verificationNotes" = NULL WHERE "status" = 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "church_claims" SET "verificationNotes" = "evidence" WHERE "status" = 'PENDING' AND "verificationNotes" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_claims" DROP COLUMN "evidence"`,
    );
  }
}
