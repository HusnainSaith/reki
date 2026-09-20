import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessUser } from '../business/entities/business-user.entity';
import { VenueAssignment } from '../business/entities/venue-assignment.entity';
import { Venue } from '../venues/entities/venue.entity';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { OffersModule } from '../offers/offers.module';
import { Busyness } from '../busyness/entities/busyness.entity';
import { LiveModule } from '../live/live.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessUser, VenueAssignment, Venue, Busyness]), OffersModule, LiveModule, AuditModule],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
