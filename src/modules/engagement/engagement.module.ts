import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { EngagementService } from './engagement.service';
import { LeaderboardsController, ReviewsController, UserEngagementController, VenueEngagementController } from './engagement.controller';
import { CheckIn } from './entities/check-in.entity';
import { Review } from './entities/review.entity';
import { VenueHistory } from './entities/venue-history.entity';
import { VenueShare } from './entities/venue-share.entity';
import { VibeAccuracyVote } from './entities/vibe-accuracy-vote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, VibeAccuracyVote, CheckIn, VenueHistory, VenueShare, User, Venue])],
  controllers: [VenueEngagementController, ReviewsController, UserEngagementController, LeaderboardsController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
