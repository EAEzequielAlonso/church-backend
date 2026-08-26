import { MigrationInterface, QueryRunner } from "typeorm";

export class Stage5MissionReportMedia1724490000000 implements MigrationInterface {
    name = 'Stage5MissionReportMedia1724490000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create table mission_report_media
        await queryRunner.query(`
            CREATE TABLE "mission_report_media" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "missionReportId" uuid NOT NULL,
                "url" text NOT NULL,
                "order" integer NOT NULL DEFAULT 0,
                "observation" text,
                CONSTRAINT "PK_mission_report_media" PRIMARY KEY ("id")
            )
        `);
        
        // Add index on missionReportId and order
        await queryRunner.query(`CREATE INDEX "IDX_mission_report_media_reportId" ON "mission_report_media" ("missionReportId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mission_report_media_reportId_order" ON "mission_report_media" ("missionReportId", "order")`);
        
        // Add foreign key
        await queryRunner.query(`
            ALTER TABLE "mission_report_media" 
            ADD CONSTRAINT "FK_mission_report_media_missionReportId" 
            FOREIGN KEY ("missionReportId") REFERENCES "mission_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // 2. Migrate existing data from attachments array
        // We will extract each element of the attachments array, and insert into mission_report_media
        await queryRunner.query(`
            INSERT INTO "mission_report_media" ("missionReportId", "url", "order")
            SELECT 
                mr.id as "missionReportId",
                elem.value as "url",
                elem.ordinality - 1 as "order"
            FROM "mission_reports" mr
            CROSS JOIN LATERAL unnest(mr."attachments") WITH ORDINALITY AS elem(value, ordinality)
            WHERE mr."attachments" IS NOT NULL AND array_length(mr."attachments", 1) > 0;
        `);

        // 3. Drop column attachments from mission_reports
        await queryRunner.query(`ALTER TABLE "mission_reports" DROP COLUMN "attachments"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Restore column attachments
        await queryRunner.query(`ALTER TABLE "mission_reports" ADD "attachments" text array NOT NULL DEFAULT '{}'`);

        // 2. Migrate data back
        await queryRunner.query(`
            UPDATE "mission_reports" mr
            SET "attachments" = (
                SELECT coalesce(array_agg(mrm.url ORDER BY mrm."order"), '{}')
                FROM "mission_report_media" mrm
                WHERE mrm."missionReportId" = mr.id
            )
        `);

        // 3. Drop table and foreign key
        await queryRunner.query(`ALTER TABLE "mission_report_media" DROP CONSTRAINT "FK_mission_report_media_missionReportId"`);
        await queryRunner.query(`DROP INDEX "IDX_mission_report_media_reportId_order"`);
        await queryRunner.query(`DROP INDEX "IDX_mission_report_media_reportId"`);
        await queryRunner.query(`DROP TABLE "mission_report_media"`);
    }
}
