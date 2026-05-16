import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingFunctionalRoles1789569000000 implements MigrationInterface {
  name = 'AddMissingFunctionalRoles1789569000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'church_persons_functionalroles_enum'
            AND e.enumlabel = 'WORSHIP_MANAGER'
        ) THEN
          ALTER TYPE "public"."church_persons_functionalroles_enum" ADD VALUE 'WORSHIP_MANAGER';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'church_persons_functionalroles_enum'
            AND e.enumlabel = 'RESOURCE_MANAGER'
        ) THEN
          ALTER TYPE "public"."church_persons_functionalroles_enum" ADD VALUE 'RESOURCE_MANAGER';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values safely in a simple reversible way.
  }
}
