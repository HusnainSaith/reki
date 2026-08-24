import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncAction } from './entities/sync-action.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { EngagementModule } from '../engagement/engagement.module';

@Module({
  imports: [
    EngagementModule,
    TypeOrmModule.forFeature([
      SyncAction,
      Venue,
      Busyness,
      Vibe,
      Offer,
      Notification,
      User,
      VenueAnalytics,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
