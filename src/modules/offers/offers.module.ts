import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { Offer } from './entities/offer.entity';
import { Redemption } from './entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, Redemption, VenueAnalytics])],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
