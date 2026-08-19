import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNeedSignalEnums1786981339184 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "need_signals_closereason_enum" ADD VALUE IF NOT EXISTS 'TEMPORARY'`,
    );
    await queryRunner.query(
      `ALTER TYPE "need_signals_closereason_enum" ADD VALUE IF NOT EXISTS 'RESOLVED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support dropping enum values easily.
  }
}
