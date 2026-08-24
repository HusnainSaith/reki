import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue, Busyness, Vibe, Notification, User, Offer, Redemption, VenueAnalytics, ActivityLog]),
  ],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
