import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from './entities/venue.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { OffersModule } from '../offers/offers.module';
import { City } from '../cities/entities/city.entity';
import { VenueAssignment } from '../business/entities/venue-assignment.entity';
import { VenueLiveUpdate } from '../worker/entities/venue-live-update.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue, VenueAnalytics, City, VenueAssignment, VenueLiveUpdate]),
    forwardRef(() => OffersModule),
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
