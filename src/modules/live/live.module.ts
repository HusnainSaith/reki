import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { LiveController } from './live.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '../offers/entities/offer.entity';
import { Venue } from '../venues/entities/venue.entity';
import { OffersModule } from '../offers/offers.module';
import { LiveService } from './live.service';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, Venue]), OffersModule],
  controllers: [LiveController],
  providers: [LiveGateway, LiveService],
  exports: [LiveGateway],
})
export class LiveModule {}
