import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhase6Foundations1787559100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(80) NOT NULL,
        "name" character varying(120) NOT NULL,
        "countryCode" character varying(2) NOT NULL,
        "timezone" character varying(64) NOT NULL,
        "defaultLocale" character varying(10) NOT NULL DEFAULT 'en-GB',
        "latitude" numeric(10,7) NOT NULL,
        "longitude" numeric(10,7) NOT NULL,
        "detectionRadiusKm" numeric(8,2) NOT NULL DEFAULT 50,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cities_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cities_active" ON "cities" ("isActive")`);
    await queryRunner.query(`
      INSERT INTO "cities" ("slug", "name", "countryCode", "timezone", "defaultLocale", "latitude", "longitude")
      VALUES
        ('manchester', 'Manchester', 'GB', 'Europe/London', 'en-GB', 53.4808, -2.2426),
        ('london', 'London', 'GB', 'Europe/London', 'en-GB', 51.5074, -0.1278),
        ('birmingham', 'Birmingham', 'GB', 'Europe/London', 'en-GB', 52.4862, -1.8904)
      ON CONFLICT ("slug") DO NOTHING
    `);
    await queryRunner.query(`ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "cityId" uuid`);
    await queryRunner.query(`
      UPDATE "venues" venue
      SET "cityId" = city."id"
      FROM "cities" city
      WHERE LOWER(venue."city") = LOWER(city."name")
        AND venue."cityId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD CONSTRAINT "FK_venues_city" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_venues_city_id" ON "venues" ("cityId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "venue_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "businessUserId" uuid NOT NULL,
        "venueId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venue_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_venue_assignment_user_venue" UNIQUE ("businessUserId", "venueId"),
        CONSTRAINT "FK_venue_assignments_user" FOREIGN KEY ("businessUserId") REFERENCES "business_users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_venue_assignments_venue" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_venue_assignments_user_active" ON "venue_assignments" ("businessUserId", "isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_venue_assignments_venue_active" ON "venue_assignments" ("venueId", "isActive")`);
    await queryRunner.query(`ALTER TABLE "redemptions" ADD COLUMN IF NOT EXISTS "redeemedByBusinessUserId" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_redemptions_redeemed_by_business_user" ON "redemptions" ("redeemedByBusinessUserId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "venue_assignments"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemptions_redeemed_by_business_user"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "redeemedByBusinessUserId"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP CONSTRAINT IF EXISTS "FK_venues_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_venues_city_id"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN IF EXISTS "cityId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cities"`);
  }
}
