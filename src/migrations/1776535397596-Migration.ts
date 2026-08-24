import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776535397596 implements MigrationInterface {
  name = 'Migration1776535397596';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enums
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_authprovider_enum" AS ENUM('email','apple','google','guest'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_role_enum" AS ENUM('user','business','admin','guest'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."venues_category_enum" AS ENUM('bar','club','restaurant','lounge','live_music_venue','pub','rooftop_bar','cocktail_bar'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."busyness_level_enum" AS ENUM('quiet','moderate','busy'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."notifications_type_enum" AS ENUM('vibe_alert','live_performance','social_checkin','offer_confirmation','welcome','weekly_recap','ticket_secured','proximity_offer'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."offers_type_enum" AS ENUM('2-for-1','discount','freebie','guestlist','happy-hour'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."redemptions_status_enum" AS ENUM('active','redeemed','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."tags_category_enum" AS ENUM('vibe','music'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."business_users_role_enum" AS ENUM('owner','manager','staff'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."devices_platform_enum" AS ENUM('ios','android','web'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sync_actions_type_enum" AS ENUM('BUSYNESS_UPDATE','VIBE_UPDATE','OFFER_TOGGLE','NOTIFICATION_READ','VENUE_SAVE','VENUE_VIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sync_actions_status_enum" AS ENUM('success','conflict','rejected','pending'); EXCEPTION WHEN duplicate_object THEN null; END $$`);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying UNIQUE,
        "phone" character varying,
        "name" character varying NOT NULL,
        "password" character varying,
        "authProvider" "public"."users_authprovider_enum" NOT NULL DEFAULT 'email',
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "isVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "preferences" jsonb,
        "savedVenues" text[] NOT NULL DEFAULT '{}',
        "currentLat" numeric(10,7),
        "currentLng" numeric(10,7),
        "locationUpdatedAt" TIMESTAMP,
        "locationEnabled" boolean NOT NULL DEFAULT false,
        "backgroundLocationEnabled" boolean NOT NULL DEFAULT false,
        "appState" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // venues
    await queryRunner.query(`
      CREATE TABLE "venues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "address" character varying NOT NULL,
        "city" character varying NOT NULL DEFAULT 'Manchester',
        "area" character varying NOT NULL,
        "category" "public"."venues_category_enum" NOT NULL,
        "lat" numeric(10,7) NOT NULL,
        "lng" numeric(10,7) NOT NULL,
        "images" text[] NOT NULL DEFAULT '{}',
        "priceLevel" integer NOT NULL DEFAULT 2,
        "openingHours" character varying,
        "closingTime" character varying,
        "isLive" boolean NOT NULL DEFAULT false,
        "tags" text[] NOT NULL DEFAULT '{}',
        "rating" numeric(2,1) NOT NULL DEFAULT 4.0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venues" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_venue_city" ON "venues" ("city")`);
    await queryRunner.query(`CREATE INDEX "IDX_venue_category" ON "venues" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_venue_price" ON "venues" ("priceLevel")`);
    await queryRunner.query(`CREATE INDEX "IDX_venue_city_category" ON "venues" ("city", "category")`);
    await queryRunner.query(`CREATE INDEX "IDX_venue_lat_lng" ON "venues" ("lat", "lng")`);

    // tags
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category" "public"."tags_category_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tags" PRIMARY KEY ("id")
      )
    `);

    // busyness
    await queryRunner.query(`
      CREATE TABLE "busyness" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venueId" uuid NOT NULL,
        "level" "public"."busyness_level_enum" NOT NULL DEFAULT 'quiet',
        "percentage" integer NOT NULL DEFAULT 25,
        "updatedBy" character varying,
        "dwellTime" integer NOT NULL DEFAULT 0,
        "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_busyness" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_busyness_venueId" UNIQUE ("venueId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_busyness_venueId" ON "busyness" ("venueId")`);

    // vibes
    await queryRunner.query(`
      CREATE TABLE "vibes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venueId" uuid NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "musicGenre" text[] NOT NULL DEFAULT '{}',
        "description" character varying,
        "vibeCheckScore" numeric(2,1) NOT NULL DEFAULT 0,
        "responseCount" integer NOT NULL DEFAULT 0,
        "updatedBy" character varying,
        "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vibes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vibes_venueId" UNIQUE ("venueId")
      )
    `);

    // offers
    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venueId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" character varying,
        "type" "public"."offers_type_enum" NOT NULL DEFAULT '2-for-1',
        "validDays" text[] NOT NULL,
        "validTimeStart" character varying NOT NULL,
        "validTimeEnd" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "redemptionCount" integer NOT NULL DEFAULT 0,
        "maxRedemptions" integer NOT NULL DEFAULT 100,
        "savingValue" numeric(8,2),
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_offer_venueId" ON "offers" ("venueId")`);
    await queryRunner.query(`CREATE INDEX "IDX_offer_isActive" ON "offers" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_offer_venueId_isActive" ON "offers" ("venueId", "isActive")`);

    // notifications
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "public"."notifications_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" character varying NOT NULL,
        "icon" character varying,
        "venueId" character varying,
        "offerId" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // redemptions
    await queryRunner.query(`
      CREATE TABLE "redemptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "offerId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "venueId" uuid NOT NULL,
        "voucherCode" character varying NOT NULL,
        "qrCodeData" character varying NOT NULL,
        "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'active',
        "transactionId" character varying NOT NULL,
        "savingValue" numeric(8,2) NOT NULL DEFAULT 0,
        "currency" character varying NOT NULL DEFAULT 'GBP',
        "redeemedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_redemptions_voucherCode" UNIQUE ("voucherCode")
      )
    `);

    // refresh_tokens
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // business_users
    await queryRunner.query(`
      CREATE TABLE "business_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "password" character varying NOT NULL,
        "venueId" uuid NOT NULL,
        "role" "public"."business_users_role_enum" NOT NULL DEFAULT 'owner',
        "phone" character varying,
        "isApproved" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_business_users_email" UNIQUE ("email")
      )
    `);

    // venue_analytics
    await queryRunner.query(`
      CREATE TABLE "venue_analytics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venueId" uuid NOT NULL,
        "date" date NOT NULL,
        "liveBusynessPercent" integer NOT NULL DEFAULT 0,
        "busynessChange" character varying,
        "avgDwellTime" integer NOT NULL DEFAULT 0,
        "dwellTimeChange" character varying,
        "vibeCheckScore" numeric(2,1) NOT NULL DEFAULT 0,
        "vibeCheckResponses" integer NOT NULL DEFAULT 0,
        "socialShares" integer NOT NULL DEFAULT 0,
        "socialSharesChange" character varying,
        "totalViews" integer NOT NULL DEFAULT 0,
        "totalSaves" integer NOT NULL DEFAULT 0,
        "offerClicks" integer NOT NULL DEFAULT 0,
        "redemptions" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venue_analytics" PRIMARY KEY ("id")
      )
    `);

    // activity_logs
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorId" character varying NOT NULL,
        "actorRole" character varying NOT NULL,
        "action" character varying NOT NULL,
        "target" character varying NOT NULL,
        "targetId" character varying,
        "details" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
      )
    `);

    // devices
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fcmToken" character varying NOT NULL,
        "platform" "public"."devices_platform_enum" NOT NULL DEFAULT 'ios',
        "deviceId" character varying NOT NULL,
        "appVersion" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastActiveAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_devices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_device_fcmToken" ON "devices" ("fcmToken")`);
    await queryRunner.query(`CREATE INDEX "IDX_device_userId" ON "devices" ("userId")`);

    // notification_preferences
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "vibeAlerts" boolean NOT NULL DEFAULT true,
        "livePerformance" boolean NOT NULL DEFAULT true,
        "socialCheckins" boolean NOT NULL DEFAULT true,
        "offerAlerts" boolean NOT NULL DEFAULT true,
        "weeklyRecap" boolean NOT NULL DEFAULT true,
        "proximityAlerts" boolean NOT NULL DEFAULT true,
        "quietHoursStart" character varying,
        "quietHoursEnd" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences_userId" UNIQUE ("userId")
      )
    `);

    // geofence_logs
    await queryRunner.query(`
      CREATE TABLE "geofence_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "venueId" character varying NOT NULL,
        "distance" numeric(10,2) NOT NULL,
        "offerId" character varying,
        "notifiedAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geofence_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_geofence_user_notified" ON "geofence_logs" ("userId", "notifiedAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_geofence_user_venue" ON "geofence_logs" ("userId", "venueId")`);

    // area_analytics
    await queryRunner.query(`
      CREATE TABLE "area_analytics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "areaName" character varying NOT NULL,
        "city" character varying NOT NULL DEFAULT 'Manchester',
        "activeVenues" integer NOT NULL DEFAULT 0,
        "totalUsers" integer NOT NULL DEFAULT 0,
        "avgBusyness" integer NOT NULL DEFAULT 0,
        "date" character varying NOT NULL,
        "hour" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_area_analytics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_area_city_date" ON "area_analytics" ("city", "date")`);

    // sync_actions
    await queryRunner.query(`
      CREATE TABLE "sync_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clientActionId" character varying NOT NULL,
        "deviceId" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "type" "public"."sync_actions_type_enum" NOT NULL,
        "status" "public"."sync_actions_status_enum" NOT NULL DEFAULT 'pending',
        "data" jsonb,
        "venueId" character varying,
        "notificationId" character varying,
        "offerId" character varying,
        "offlineTimestamp" TIMESTAMP NOT NULL,
        "conflictMessage" character varying,
        "serverData" jsonb,
        "conflictOptions" text,
        "syncedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sync_actions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sync_status" ON "sync_actions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_sync_userId" ON "sync_actions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_sync_deviceId" ON "sync_actions" ("deviceId")`);

    // Foreign keys
    await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_offerId" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "offers" ADD CONSTRAINT "FK_offers_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "busyness" ADD CONSTRAINT "FK_busyness_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "vibes" ADD CONSTRAINT "FK_vibes_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "business_users" ADD CONSTRAINT "FK_business_users_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "venue_analytics" ADD CONSTRAINT "FK_venue_analytics_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_devices_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_userId"`);
    await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_devices_userId"`);
    await queryRunner.query(`ALTER TABLE "venue_analytics" DROP CONSTRAINT "FK_venue_analytics_venueId"`);
    await queryRunner.query(`ALTER TABLE "business_users" DROP CONSTRAINT "FK_business_users_venueId"`);
    await queryRunner.query(`ALTER TABLE "vibes" DROP CONSTRAINT "FK_vibes_venueId"`);
    await queryRunner.query(`ALTER TABLE "busyness" DROP CONSTRAINT "FK_busyness_venueId"`);
    await queryRunner.query(`ALTER TABLE "offers" DROP CONSTRAINT "FK_offers_venueId"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_userId"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_venueId"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_userId"`);
    await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_redemptions_offerId"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_userId"`);

    await queryRunner.query(`DROP TABLE "sync_actions"`);
    await queryRunner.query(`DROP TABLE "area_analytics"`);
    await queryRunner.query(`DROP TABLE "geofence_logs"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TABLE "devices"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TABLE "venue_analytics"`);
    await queryRunner.query(`DROP TABLE "business_users"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "redemptions"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TABLE "vibes"`);
    await queryRunner.query(`DROP TABLE "busyness"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "venues"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."sync_actions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sync_actions_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."devices_platform_enum"`);
    await queryRunner.query(`DROP TYPE "public"."business_users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tags_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."offers_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."busyness_level_enum"`);
    await queryRunner.query(`DROP TYPE "public"."venues_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_authprovider_enum"`);
  }
}
