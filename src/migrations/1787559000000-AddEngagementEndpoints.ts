import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEngagementEndpoints1787559000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ['REVIEW_CREATE','REVIEW_UPDATE','CHECK_IN','VIBE_ACCURACY_VOTE','VENUE_HISTORY_VIEW','VENUE_SHARE']) {
      await queryRunner.query(`ALTER TYPE "public"."sync_actions_type_enum" ADD VALUE IF NOT EXISTS '${value}'`);
    }
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "venue_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "venueId" uuid NOT NULL, "rating" integer NOT NULL CHECK ("rating" BETWEEN 1 AND 5), "text" character varying(500), "vibeAccurate" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_venue_reviews" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_review_user_venue" ON "venue_reviews" ("userId", "venueId")`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "vibe_accuracy_votes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "venueId" uuid NOT NULL, "accurate" boolean NOT NULL, "observedVibe" character varying, "votedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_vibe_accuracy_votes" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vibe_vote_user_venue" ON "vibe_accuracy_votes" ("userId", "venueId")`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "venue_check_ins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "venueId" uuid NOT NULL, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "accuracy" double precision NOT NULL, "checkedInAt" TIMESTAMP NOT NULL, "pointsAwarded" integer NOT NULL DEFAULT 20, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_venue_check_ins" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkin_user_created" ON "venue_check_ins" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "venue_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "venueId" uuid NOT NULL, "viewedAt" TIMESTAMP NOT NULL, "source" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_venue_history" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_history_user_venue" ON "venue_history" ("userId", "venueId")`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "venue_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "venueId" uuid NOT NULL, "channel" character varying NOT NULL, "sharedAt" TIMESTAMP NOT NULL, "pointsAwarded" integer NOT NULL DEFAULT 5, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_venue_shares" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_share_venue_created" ON "venue_shares" ("venueId", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_shares"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_check_ins"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vibe_accuracy_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_reviews"`);
  }
}
