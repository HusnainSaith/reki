import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompletePhase6WorkerAndLiveUpdates1787559300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_users" ADD COLUMN IF NOT EXISTS "accountOwnerId" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_business_users_account_owner" ON "business_users" ("accountOwnerId")`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "venue_live_updates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venueId" uuid NOT NULL,
        "type" character varying(40) NOT NULL,
        "title" character varying(140) NOT NULL,
        "details" text,
        "startsAt" TIMESTAMP,
        "endsAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "updatedByBusinessUserId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venue_live_updates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_venue_live_updates_venue" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_venue_live_updates_user" FOREIGN KEY ("updatedByBusinessUserId") REFERENCES "business_users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_venue_live_updates_venue_active" ON "venue_live_updates" ("venueId", "isActive")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_live_updates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_business_users_account_owner"`);
    await queryRunner.query(`ALTER TABLE "business_users" DROP COLUMN IF EXISTS "accountOwnerId"`);
  }
}
