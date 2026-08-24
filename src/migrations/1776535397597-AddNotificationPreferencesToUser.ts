import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferencesToUser1776535397597 implements MigrationInterface {
  name = 'AddNotificationPreferencesToUser1776535397597';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing users to have default notification preferences
    // This ensures backward compatibility - all existing users will have notifications enabled by default
    await queryRunner.query(`
      UPDATE users 
      SET preferences = COALESCE(preferences, '{}'::jsonb) || 
        jsonb_build_object(
          'notifications', 
          jsonb_build_object(
            'weeklyRecap', true,
            'offerAlerts', true,
            'geofenceAlerts', true
          )
        )
      WHERE preferences IS NULL 
         OR preferences->'notifications' IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove notification preferences from all users
    await queryRunner.query(`
      UPDATE users 
      SET preferences = preferences - 'notifications'
      WHERE preferences IS NOT NULL 
        AND preferences->'notifications' IS NOT NULL
    `);
  }
}
