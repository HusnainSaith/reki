import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';
import { GeofenceLog } from './entities/geofence-log.entity';
import { AreaAnalytics } from './entities/area-analytics.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeofenceLog, AreaAnalytics, Venue, Offer, Notification, User]),
  ],
  controllers: [GeofenceController],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
