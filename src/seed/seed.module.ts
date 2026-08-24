import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';

import { User } from '../modules/users/entities/user.entity';
import { Venue } from '../modules/venues/entities/venue.entity';
import { Busyness } from '../modules/busyness/entities/busyness.entity';
import { Vibe } from '../modules/vibes/entities/vibe.entity';
import { Offer } from '../modules/offers/entities/offer.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { VenueAnalytics } from '../modules/business/entities/venue-analytics.entity';
import { BusinessUser } from '../modules/business/entities/business-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Venue,
      Busyness,
      Vibe,
      Offer,
      Notification,
      Tag,
      VenueAnalytics,
      BusinessUser,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
