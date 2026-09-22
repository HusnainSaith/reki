import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessUser } from './entities/business-user.entity';
import { VenueAnalytics } from './entities/venue-analytics.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { PushModule } from '../push/push.module';
import { LiveModule } from '../live/live.module';
import { EmailModule } from '../email/email.module';
import { UploadModule } from '../upload/upload.module';
import { VenueAssignment } from './entities/venue-assignment.entity';
import { City } from '../cities/entities/city.entity';
import { VenueLiveUpdate } from '../worker/entities/venue-live-update.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessUser,
      VenueAnalytics,
      Venue,
      Offer,
      Redemption,
      Busyness,
      Vibe,
      Notification,
      User,
      ActivityLog,
      VenueAssignment,
      City,
      VenueLiveUpdate,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('app.jwt.expiration') as any },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
    PushModule,
    LiveModule,
    UploadModule,
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
