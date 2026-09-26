import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { appConfig, databaseConfig, billingConfig, intelligenceConfig } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VenuesModule } from './modules/venues/venues.module';
import { BusynessModule } from './modules/busyness/busyness.module';
import { VibesModule } from './modules/vibes/vibes.module';
import { OffersModule } from './modules/offers/offers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TagsModule } from './modules/tags/tags.module';
import { BusinessModule } from './modules/business/business.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { DemoModule } from './modules/demo/demo.module';
import { GeofenceModule } from './modules/geofence/geofence.module';
import { DevicesModule } from './modules/devices/devices.module';
import { PushModule } from './modules/push/push.module';
import { LiveModule } from './modules/live/live.module';
import { SyncModule } from './modules/sync/sync.module';
import { CronModule } from './modules/cron/cron.module';
import { SeedModule } from './seed/seed.module';
import { UploadModule } from './modules/upload/upload.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { CitiesModule } from './modules/cities/cities.module';
import { WorkerModule } from './modules/worker/worker.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      // Local development keeps the environment file under src, while
      // deployments may provide one at the project root.
      envFilePath: ['.env', 'src/.env'],
      load: [appConfig, databaseConfig, billingConfig, intelligenceConfig],
    }),

    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        // Schema changes are versioned migrations. Automatic synchronization can
        // destructively rewrite shared enum types used by plan price history.
        synchronize: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Cron Job Scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    SyncModule,
    AuthModule,
    UsersModule,
    VenuesModule,
    BusynessModule,
    VibesModule,
    OffersModule,
    NotificationsModule,
    TagsModule,
    BusinessModule,
    AdminModule,
    AuditModule,
    DemoModule,
    GeofenceModule,
    DevicesModule,
    PushModule,
    LiveModule,
    CronModule,
    SeedModule,
    UploadModule,
    EngagementModule,
    CitiesModule,
    WorkerModule,
    BillingModule,
    IntelligenceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
