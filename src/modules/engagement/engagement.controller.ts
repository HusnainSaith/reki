import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoGuestGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import { User } from '../users/entities/user.entity';
import { CheckInDto, CreateReviewDto, UpdateReviewDto, VenueHistoryDto, VenueShareDto, VibeAccuracyVoteDto } from './dto/engagement.dto';
import { EngagementService } from './engagement.service';

@ApiTags('Venue Engagement')
@Controller('venues')
export class VenueEngagementController {
  constructor(private service: EngagementService) {}

  @Get(':venueId/reviews')
  @ApiOperation({ summary: 'List venue reviews and rating summary' })
  getReviews(@Param('venueId', ParseUUIDPipe) venueId: string, @Query('page') page='1', @Query('limit') limit='20', @Query('sort') sort='newest') {
    return this.service.getReviews(venueId, Number(page), Number(limit), sort);
  }

  @Post(':venueId/reviews') @UseGuards(JwtAuthGuard, NoGuestGuard) @ApiBearerAuth() @ApiCreatedResponse()
  createReview(@CurrentUser() user: User, @Param('venueId', ParseUUIDPipe) venueId: string, @Body() dto: CreateReviewDto) { return this.service.createReview(user.id, venueId, dto); }

  @Post(':venueId/vibe-accuracy-votes') @UseGuards(JwtAuthGuard, NoGuestGuard) @ApiBearerAuth()
  vote(@CurrentUser() user: User, @Param('venueId', ParseUUIDPipe) venueId: string, @Body() dto: VibeAccuracyVoteDto) { return this.service.vote(user.id, venueId, dto); }

  @Post(':venueId/check-ins') @UseGuards(JwtAuthGuard, NoGuestGuard) @ApiBearerAuth()
  checkIn(@CurrentUser() user: User, @Param('venueId', ParseUUIDPipe) venueId: string, @Body() dto: CheckInDto) { return this.service.checkIn(user.id, venueId, dto); }

  @Post(':venueId/shares') @UseGuards(JwtAuthGuard, NoGuestGuard) @ApiBearerAuth()
  share(@CurrentUser() user: User, @Param('venueId', ParseUUIDPipe) venueId: string, @Body() dto: VenueShareDto) { return this.service.share(user.id, venueId, dto); }
}

@ApiTags('Reviews') @ApiBearerAuth() @Controller('reviews') @UseGuards(JwtAuthGuard, NoGuestGuard)
export class ReviewsController {
  constructor(private service: EngagementService) {}
  @Patch(':reviewId') update(@CurrentUser() user: User, @Param('reviewId', ParseUUIDPipe) id: string, @Body() dto: UpdateReviewDto) { return this.service.updateReview(user.id, id, dto); }
  @Delete(':reviewId') remove(@CurrentUser() user: User, @Param('reviewId', ParseUUIDPipe) id: string) { return this.service.deleteReview(user.id, id); }
}

@ApiTags('Users') @ApiBearerAuth() @Controller('users') @UseGuards(JwtAuthGuard, NoGuestGuard)
export class UserEngagementController {
  constructor(private service: EngagementService) {}
  @Get('check-ins') getCheckIns(@CurrentUser() user: User, @Query('page') page='1', @Query('limit') limit='20') { return this.service.getCheckIns(user.id, Number(page), Number(limit)); }
  @Post('history/venues/:venueId') recordHistory(@CurrentUser() user: User, @Param('venueId', ParseUUIDPipe) venueId: string, @Body() dto: VenueHistoryDto) { return this.service.recordHistory(user.id, venueId, dto); }
  @Get('history/venues') getHistory(@CurrentUser() user: User) { return this.service.getHistory(user.id); }
  @Delete('history/venues') clearHistory(@CurrentUser() user: User) { return this.service.clearHistory(user.id); }
  @Get('achievements') achievements(@CurrentUser() user: User) { return this.service.getAchievements(user.id); }
}

@ApiTags('Leaderboards') @Controller('leaderboards')
export class LeaderboardsController {
  constructor(private service: EngagementService) {}
  @Get() get(@Query('period') period='weekly', @Query('city') city='manchester', @Query('limit') limit='50') { return this.service.leaderboard(period, city, Number(limit)); }
}
