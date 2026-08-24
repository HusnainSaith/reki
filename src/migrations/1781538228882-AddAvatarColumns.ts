import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarColumns1781538228882 implements MigrationInterface {
    name = 'AddAvatarColumns1781538228882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "busyness" DROP CONSTRAINT "FK_busyness_venueId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_userId"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_offerId"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_userId"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_venueId"`);
        await queryRunner.query(`ALTER TABLE "offers" DROP CONSTRAINT "FK_offers_venueId"`);
        await queryRunner.query(`ALTER TABLE "venue_analytics" DROP CONSTRAINT "FK_venue_analytics_venueId"`);
        await queryRunner.query(`ALTER TABLE "venues" DROP CONSTRAINT "FK_venues_businessUserId"`);
        await queryRunner.query(`ALTER TABLE "vibes" DROP CONSTRAINT "FK_vibes_venueId"`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_userId"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_devices_userId"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_userId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying`);
        await queryRunner.query(`ALTER TABLE "offers" ADD "isAvailableNow" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "business_users" ADD "avatar" character varying`);
        await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "rating" SET DEFAULT '4'`);
        await queryRunner.query(`ALTER TABLE "busyness" ADD CONSTRAINT "FK_fdf07673a5fe0d9db051dabca0b" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_f892a328cfea20dcf8a6a4b34b1" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_112ccf6fd07f1ea20a803e4e874" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offers" ADD CONSTRAINT "FK_dac88a887d60c75ac7f1fcab484" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venue_analytics" ADD CONSTRAINT "FK_3cce2f3c2fd1f1ea8567043cf19" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venues" ADD CONSTRAINT "FK_9f840ea0b074078f9cba9d5f10d" FOREIGN KEY ("businessUserId") REFERENCES "business_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vibes" ADD CONSTRAINT "FK_2d7c8fd6adac3e40cf00ee2cf6b" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_b70c44e8b00757584a393225593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6"`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_b70c44e8b00757584a393225593"`);
        await queryRunner.query(`ALTER TABLE "vibes" DROP CONSTRAINT "FK_2d7c8fd6adac3e40cf00ee2cf6b"`);
        await queryRunner.query(`ALTER TABLE "venues" DROP CONSTRAINT "FK_9f840ea0b074078f9cba9d5f10d"`);
        await queryRunner.query(`ALTER TABLE "venue_analytics" DROP CONSTRAINT "FK_3cce2f3c2fd1f1ea8567043cf19"`);
        await queryRunner.query(`ALTER TABLE "offers" DROP CONSTRAINT "FK_dac88a887d60c75ac7f1fcab484"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_112ccf6fd07f1ea20a803e4e874"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_f892a328cfea20dcf8a6a4b34b1"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "busyness" DROP CONSTRAINT "FK_fdf07673a5fe0d9db051dabca0b"`);
        await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "rating" SET DEFAULT 4.0`);
        await queryRunner.query(`ALTER TABLE "business_users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "offers" DROP COLUMN "isAvailableNow"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_devices_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vibes" ADD CONSTRAINT "FK_vibes_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venues" ADD CONSTRAINT "FK_venues_businessUserId" FOREIGN KEY ("businessUserId") REFERENCES "business_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venue_analytics" ADD CONSTRAINT "FK_venue_analytics_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offers" ADD CONSTRAINT "FK_offers_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_offerId" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "busyness" ADD CONSTRAINT "FK_busyness_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
