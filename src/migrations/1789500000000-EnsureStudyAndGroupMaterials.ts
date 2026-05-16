import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureStudyAndGroupMaterials1789500000000 implements MigrationInterface {
  name = 'EnsureStudyAndGroupMaterials1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'study_resources_type_enum'
        ) THEN
          CREATE TYPE "public"."study_resources_type_enum" AS ENUM ('youtube', 'drive', 'link', 'book');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "study_resources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "churchId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "type" "public"."study_resources_type_enum" NOT NULL DEFAULT 'link',
        "url" character varying,
        "libraryBookId" uuid,
        "thumbnail" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_eccbca470cd560fa06898dd8344" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_54b7de2a4eff695aa62947630a" ON "study_resources" ("churchId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "study_topics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "churchId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "order" integer NOT NULL DEFAULT '0',
        CONSTRAINT "PK_69d94fc46948accd03f8845efbd" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_737f1ad6d75ad970af134f7601" ON "study_topics" ("churchId", "order")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "study_collections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "churchId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "order" integer NOT NULL DEFAULT '0',
        CONSTRAINT "PK_8bb8daf954caad468625536a613" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a8a4eff25c7d37741cc4f1e297" ON "study_collections" ("churchId", "order")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "study_topic_resources" (
        "topicId" uuid NOT NULL,
        "resourceId" uuid NOT NULL,
        CONSTRAINT "PK_cd9fa64934497823b971093e818" PRIMARY KEY ("topicId", "resourceId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5909e7f4d8c84d7a9042a090ed" ON "study_topic_resources" ("topicId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_4dd1edf876dd8f24089f0be485" ON "study_topic_resources" ("resourceId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "study_collection_topics" (
        "collectionId" uuid NOT NULL,
        "topicId" uuid NOT NULL,
        CONSTRAINT "PK_9a5b79ee23bcd4a040a0593d544" PRIMARY KEY ("collectionId", "topicId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8809f8c15eb2348c97feb88704" ON "study_collection_topics" ("collectionId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_743c4a98e61f949daa24efabeb" ON "study_collection_topics" ("topicId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_study_resources" (
        "groupId" uuid NOT NULL,
        "resourceId" uuid NOT NULL,
        CONSTRAINT "PK_group_study_resources" PRIMARY KEY ("groupId", "resourceId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_group_study_resources_group" ON "group_study_resources" ("groupId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_group_study_resources_resource" ON "group_study_resources" ("resourceId")`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_54b7de2a4eff695aa62947630a9'
        ) THEN
          ALTER TABLE "study_resources" ADD CONSTRAINT "FK_54b7de2a4eff695aa62947630a9"
          FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_f6733c0294ea5b8f41032d05e04'
        ) THEN
          ALTER TABLE "study_resources" ADD CONSTRAINT "FK_f6733c0294ea5b8f41032d05e04"
          FOREIGN KEY ("libraryBookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_aaf013b06966f4d85a7a29103d4'
        ) THEN
          ALTER TABLE "study_topics" ADD CONSTRAINT "FK_aaf013b06966f4d85a7a29103d4"
          FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_44c5e26e97a9451924a596308be'
        ) THEN
          ALTER TABLE "study_collections" ADD CONSTRAINT "FK_44c5e26e97a9451924a596308be"
          FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_5909e7f4d8c84d7a9042a090edf'
        ) THEN
          ALTER TABLE "study_topic_resources" ADD CONSTRAINT "FK_5909e7f4d8c84d7a9042a090edf"
          FOREIGN KEY ("topicId") REFERENCES "study_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_4dd1edf876dd8f24089f0be485b'
        ) THEN
          ALTER TABLE "study_topic_resources" ADD CONSTRAINT "FK_4dd1edf876dd8f24089f0be485b"
          FOREIGN KEY ("resourceId") REFERENCES "study_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_8809f8c15eb2348c97feb887049'
        ) THEN
          ALTER TABLE "study_collection_topics" ADD CONSTRAINT "FK_8809f8c15eb2348c97feb887049"
          FOREIGN KEY ("collectionId") REFERENCES "study_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_743c4a98e61f949daa24efabeb3'
        ) THEN
          ALTER TABLE "study_collection_topics" ADD CONSTRAINT "FK_743c4a98e61f949daa24efabeb3"
          FOREIGN KEY ("topicId") REFERENCES "study_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_study_resources_group'
        ) THEN
          ALTER TABLE "group_study_resources" ADD CONSTRAINT "FK_group_study_resources_group"
          FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_study_resources_resource'
        ) THEN
          ALTER TABLE "group_study_resources" ADD CONSTRAINT "FK_group_study_resources_resource"
          FOREIGN KEY ("resourceId") REFERENCES "study_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "group_study_resources" DROP CONSTRAINT IF EXISTS "FK_group_study_resources_resource"`);
    await queryRunner.query(`ALTER TABLE "group_study_resources" DROP CONSTRAINT IF EXISTS "FK_group_study_resources_group"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_study_resources_resource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_study_resources_group"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_study_resources"`);
  }
}
