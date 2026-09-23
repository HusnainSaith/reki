import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { BusinessUser } from '../business/entities/business-user.entity';
import { GeofenceLog } from '../geofence/entities/geofence-log.entity';
import { Device } from '../devices/entities/device.entity';
import { SyncAction } from '../sync/entities/sync-action.entity';
import { City } from '../cities/entities/city.entity';
import { PushModule } from '../push/push.module';
import { LiveModule } from '../live/live.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Venue,
      Offer,
      Redemption,
      Notification,
      ActivityLog,
      BusinessUser,
      GeofenceLog,
      Device,
      SyncAction,
      City,
    ]),
    PushModule,
    LiveModule,
    SyncModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
