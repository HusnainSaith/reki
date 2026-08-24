import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBusinessVenueRelationship1776545000000 implements MigrationInterface {
    name = 'UpdateBusinessVenueRelationship1776545000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if businessUserId column exists, if not add it
        const hasColumn = await queryRunner.hasColumn('venues', 'businessUserId');
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "venues" ADD "businessUserId" uuid`);
        }
        
        // Check if venueId still exists in business_users before migrating data
        const hasVenueIdColumn = await queryRunner.hasColumn('business_users', 'venueId');
        if (hasVenueIdColumn) {
            // Migrate existing data: copy venueId from business_users to businessUserId in venues
            await queryRunner.query(`
                UPDATE "venues" v
                SET "businessUserId" = bu.id
                FROM "business_users" bu
                WHERE bu."venueId" = v.id
                AND v."businessUserId" IS NULL
            `);
            
            // Drop old venueId column from business_users (after data migration)
            await queryRunner.query(`ALTER TABLE "business_users" DROP CONSTRAINT IF EXISTS "FK_business_users_venueId"`);
            await queryRunner.query(`ALTER TABLE "business_users" DROP COLUMN "venueId"`);
        }
        
        // Add foreign key constraint if not exists
        const hasForeignKey = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'venues' 
            AND constraint_name = 'FK_venues_businessUserId'
        `);
        
        if (hasForeignKey.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "venues" 
                ADD CONSTRAINT "FK_venues_businessUserId" 
                FOREIGN KEY ("businessUserId") 
                REFERENCES "business_users"("id") 
                ON DELETE SET NULL 
                ON UPDATE NO ACTION
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add venueId back to business_users
        const hasVenueIdColumn = await queryRunner.hasColumn('business_users', 'venueId');
        if (!hasVenueIdColumn) {
            await queryRunner.query(`ALTER TABLE "business_users" ADD "venueId" uuid`);
        }
        
        // Migrate data back (take first venue for each business user)
        await queryRunner.query(`
            UPDATE "business_users" bu
            SET "venueId" = (
                SELECT v.id 
                FROM "venues" v 
                WHERE v."businessUserId" = bu.id 
                LIMIT 1
            )
        `);
        
        // Add foreign key back
        await queryRunner.query(`
            ALTER TABLE "business_users" 
            ADD CONSTRAINT "FK_business_users_venueId" 
            FOREIGN KEY ("venueId") 
            REFERENCES "venues"("id") 
            ON DELETE NO ACTION 
            ON UPDATE NO ACTION
        `);
        
        // Drop businessUserId from venues
        await queryRunner.query(`ALTER TABLE "venues" DROP CONSTRAINT IF EXISTS "FK_venues_businessUserId"`);
        await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "businessUserId"`);
    }
}
