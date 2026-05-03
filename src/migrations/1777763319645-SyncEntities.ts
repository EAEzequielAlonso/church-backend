import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncEntities1777763319645 implements MigrationInterface {
    name = 'SyncEntities1777763319645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."study_resources_type_enum" AS ENUM('youtube', 'drive', 'link', 'book')`);
        await queryRunner.query(`CREATE TABLE "study_resources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "churchId" uuid NOT NULL, "title" character varying NOT NULL, "description" text, "type" "public"."study_resources_type_enum" NOT NULL DEFAULT 'link', "url" character varying, "libraryBookId" uuid, "thumbnail" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eccbca470cd560fa06898dd8344" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54b7de2a4eff695aa62947630a" ON "study_resources" ("churchId") `);
        await queryRunner.query(`CREATE TABLE "study_topics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "churchId" uuid NOT NULL, "title" character varying NOT NULL, "description" text, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_69d94fc46948accd03f8845efbd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_737f1ad6d75ad970af134f7601" ON "study_topics" ("churchId", "order") `);
        await queryRunner.query(`CREATE TABLE "study_collections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "churchId" uuid NOT NULL, "title" character varying NOT NULL, "description" text, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8bb8daf954caad468625536a613" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a8a4eff25c7d37741cc4f1e297" ON "study_collections" ("churchId", "order") `);
        await queryRunner.query(`CREATE TABLE "study_topic_resources" ("topicId" uuid NOT NULL, "resourceId" uuid NOT NULL, CONSTRAINT "PK_cd9fa64934497823b971093e818" PRIMARY KEY ("topicId", "resourceId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5909e7f4d8c84d7a9042a090ed" ON "study_topic_resources" ("topicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4dd1edf876dd8f24089f0be485" ON "study_topic_resources" ("resourceId") `);
        await queryRunner.query(`CREATE TABLE "study_collection_topics" ("collectionId" uuid NOT NULL, "topicId" uuid NOT NULL, CONSTRAINT "PK_9a5b79ee23bcd4a040a0593d544" PRIMARY KEY ("collectionId", "topicId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8809f8c15eb2348c97feb88704" ON "study_collection_topics" ("collectionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_743c4a98e61f949daa24efabeb" ON "study_collection_topics" ("topicId") `);
        await queryRunner.query(`ALTER TYPE "public"."church_persons_functionalroles_enum" RENAME TO "church_persons_functionalroles_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."church_persons_functionalroles_enum" AS ENUM('ADMIN_CHURCH', 'TREASURER', 'AUDITOR', 'COUNSELOR', 'MINISTRY_LEADER', 'LIBRARIAN', 'DISCIPLER', 'RESOURCE_MANAGER', 'MEMBER')`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" TYPE "public"."church_persons_functionalroles_enum"[] USING "functionalRoles"::"text"::"public"."church_persons_functionalroles_enum"[]`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "public"."church_persons_functionalroles_enum_old"`);
        await queryRunner.query(`ALTER TABLE "study_resources" ADD CONSTRAINT "FK_54b7de2a4eff695aa62947630a9" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "study_resources" ADD CONSTRAINT "FK_f6733c0294ea5b8f41032d05e04" FOREIGN KEY ("libraryBookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "study_topics" ADD CONSTRAINT "FK_aaf013b06966f4d85a7a29103d4" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "study_collections" ADD CONSTRAINT "FK_44c5e26e97a9451924a596308be" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "study_topic_resources" ADD CONSTRAINT "FK_5909e7f4d8c84d7a9042a090edf" FOREIGN KEY ("topicId") REFERENCES "study_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "study_topic_resources" ADD CONSTRAINT "FK_4dd1edf876dd8f24089f0be485b" FOREIGN KEY ("resourceId") REFERENCES "study_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "study_collection_topics" ADD CONSTRAINT "FK_8809f8c15eb2348c97feb887049" FOREIGN KEY ("collectionId") REFERENCES "study_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "study_collection_topics" ADD CONSTRAINT "FK_743c4a98e61f949daa24efabeb3" FOREIGN KEY ("topicId") REFERENCES "study_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "study_collection_topics" DROP CONSTRAINT "FK_743c4a98e61f949daa24efabeb3"`);
        await queryRunner.query(`ALTER TABLE "study_collection_topics" DROP CONSTRAINT "FK_8809f8c15eb2348c97feb887049"`);
        await queryRunner.query(`ALTER TABLE "study_topic_resources" DROP CONSTRAINT "FK_4dd1edf876dd8f24089f0be485b"`);
        await queryRunner.query(`ALTER TABLE "study_topic_resources" DROP CONSTRAINT "FK_5909e7f4d8c84d7a9042a090edf"`);
        await queryRunner.query(`ALTER TABLE "study_collections" DROP CONSTRAINT "FK_44c5e26e97a9451924a596308be"`);
        await queryRunner.query(`ALTER TABLE "study_topics" DROP CONSTRAINT "FK_aaf013b06966f4d85a7a29103d4"`);
        await queryRunner.query(`ALTER TABLE "study_resources" DROP CONSTRAINT "FK_f6733c0294ea5b8f41032d05e04"`);
        await queryRunner.query(`ALTER TABLE "study_resources" DROP CONSTRAINT "FK_54b7de2a4eff695aa62947630a9"`);
        await queryRunner.query(`CREATE TYPE "public"."church_persons_functionalroles_enum_old" AS ENUM('ADMIN_CHURCH', 'AUDITOR', 'COUNSELOR', 'DISCIPLER', 'LIBRARIAN', 'MEMBER', 'MINISTRY_LEADER', 'TREASURER')`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" TYPE "public"."church_persons_functionalroles_enum_old"[] USING "functionalRoles"::"text"::"public"."church_persons_functionalroles_enum_old"[]`);
        await queryRunner.query(`ALTER TABLE "church_persons" ALTER COLUMN "functionalRoles" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "public"."church_persons_functionalroles_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."church_persons_functionalroles_enum_old" RENAME TO "church_persons_functionalroles_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_743c4a98e61f949daa24efabeb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8809f8c15eb2348c97feb88704"`);
        await queryRunner.query(`DROP TABLE "study_collection_topics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dd1edf876dd8f24089f0be485"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5909e7f4d8c84d7a9042a090ed"`);
        await queryRunner.query(`DROP TABLE "study_topic_resources"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8a4eff25c7d37741cc4f1e297"`);
        await queryRunner.query(`DROP TABLE "study_collections"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_737f1ad6d75ad970af134f7601"`);
        await queryRunner.query(`DROP TABLE "study_topics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54b7de2a4eff695aa62947630a"`);
        await queryRunner.query(`DROP TABLE "study_resources"`);
        await queryRunner.query(`DROP TYPE "public"."study_resources_type_enum"`);
    }

}
