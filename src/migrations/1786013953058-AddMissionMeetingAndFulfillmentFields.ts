import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissionMeetingAndFulfillmentFields1786013953058 implements MigrationInterface {
    name = 'AddMissionMeetingAndFulfillmentFields1786013953058'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mission_needs" ADD "fulfilledByChurchId" uuid`);
        await queryRunner.query(`ALTER TABLE "mission_needs" ADD "fulfilledByPersonId" uuid`);
        await queryRunner.query(`ALTER TABLE "mission_needs" ADD "fulfilledAt" TIMESTAMP`);
        await queryRunner.query(`CREATE TYPE "public"."mission_projects_meetingday_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingDay" "public"."mission_projects_meetingday_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."mission_projects_meetingfrequency_enum" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY')`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingFrequency" "public"."mission_projects_meetingfrequency_enum"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingTime" TIME`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingTimezone" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."mission_projects_meetingmodality_enum" AS ENUM('IN_PERSON', 'ONLINE', 'HYBRID')`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingModality" "public"."mission_projects_meetingmodality_enum"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" ADD "meetingAddress" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingAddress"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingModality"`);
        await queryRunner.query(`DROP TYPE "public"."mission_projects_meetingmodality_enum"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingTimezone"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingTime"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingFrequency"`);
        await queryRunner.query(`DROP TYPE "public"."mission_projects_meetingfrequency_enum"`);
        await queryRunner.query(`ALTER TABLE "mission_projects" DROP COLUMN "meetingDay"`);
        await queryRunner.query(`DROP TYPE "public"."mission_projects_meetingday_enum"`);
        await queryRunner.query(`ALTER TABLE "mission_needs" DROP COLUMN "fulfilledAt"`);
        await queryRunner.query(`ALTER TABLE "mission_needs" DROP COLUMN "fulfilledByPersonId"`);
        await queryRunner.query(`ALTER TABLE "mission_needs" DROP COLUMN "fulfilledByChurchId"`);
    }

}
