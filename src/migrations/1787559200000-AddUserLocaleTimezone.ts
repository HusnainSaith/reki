import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocaleTimezone1787559200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" character varying(10)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" character varying(64)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "locale"`);
  }
}