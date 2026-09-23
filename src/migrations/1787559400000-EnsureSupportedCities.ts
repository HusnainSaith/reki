import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureSupportedCities1787559400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cities" ("slug", "name", "countryCode", "timezone", "defaultLocale", "latitude", "longitude", "isActive")
      VALUES
        ('manchester', 'Manchester', 'GB', 'Europe/London', 'en-GB', 53.4808, -2.2426, true),
        ('london', 'London', 'GB', 'Europe/London', 'en-GB', 51.5074, -0.1278, true),
        ('birmingham', 'Birmingham', 'GB', 'Europe/London', 'en-GB', 52.4862, -1.8904, true)
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "countryCode" = EXCLUDED."countryCode",
        "timezone" = EXCLUDED."timezone",
        "defaultLocale" = EXCLUDED."defaultLocale",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "isActive" = true,
        "updatedAt" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cities"
      WHERE "slug" IN ('manchester', 'london', 'birmingham')
    `);
  }
}