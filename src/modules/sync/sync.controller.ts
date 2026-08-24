import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards';
import { NoGuestGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';
import { SubmitSyncQueueDto, UserStateDto } from './dto';
import { CacheTTL, NoCache } from '../../common/interceptors/cache-headers.interceptor';

@ApiTags('Sync')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@Controller()
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // ─── SYNC QUEUE ───────────────────────────────────────

  @Post('sync/queue')
  @UseGuards(NoGuestGuard)
  @NoCache()
  @ApiOperation({ summary: 'Submit offline action queue for processing' })
  @ApiBody({ type: SubmitSyncQueueDto })
  @ApiCreatedResponse({ description: 'Queue processed — returns per-action results' })
  @ApiForbiddenResponse({ description: 'Guest users cannot submit sync queues' })
  async submitSyncQueue(
    @CurrentUser() user: User,
    @Body() dto: SubmitSyncQueueDto,
  ) {
    return this.syncService.processSyncQueue(user.id, dto.deviceId, dto.actions);
  }

  @Get('sync/status')
  @NoCache()
  @ApiOperation({ summary: 'Check sync status for a device' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiOkResponse({ description: 'Sync status + pending/processed action counts' })
  async getSyncStatus(@Query('deviceId') deviceId: string) {
    return this.syncService.getSyncStatus(deviceId);
  }

  // ─── DELTA SYNC ENDPOINTS ─────────────────────────────

  @Get('venues/sync')
  @CacheTTL(120)
  @ApiOperation({ summary: 'Get venues changed since timestamp (delta sync)' })
  @ApiQuery({ name: 'since', required: true, description: 'ISO timestamp' })
  @ApiOkResponse({ description: 'Venues with updatedAt > since' })
  async venuesSync(@Query('since') since: string) {
    return this.syncService.getVenuesSyncSince(since);
  }

  @Get('notifications/sync')
  @UseGuards(NoGuestGuard)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get notifications since timestamp (delta sync)' })
  @ApiQuery({ name: 'since', required: true, description: 'ISO timestamp' })
  @ApiOkResponse({ description: 'User notifications created after since' })
  @ApiForbiddenResponse({ description: 'Guest users cannot access notifications' })
  async notificationsSync(
    @CurrentUser() user: User,
    @Query('since') since: string,
  ) {
    return this.syncService.getNotificationsSyncSince(user.id, since);
  }

  @Get('offers/sync')
  @CacheTTL(120)
  @ApiOperation({ summary: 'Get offers changed since timestamp (delta sync)' })
  @ApiQuery({ name: 'since', required: true, description: 'ISO timestamp' })
  @ApiOkResponse({ description: 'Offers with updatedAt > since' })
  async offersSync(@Query('since') since: string) {
    return this.syncService.getOffersSyncSince(since);
  }

  // ─── STATE PERSISTENCE ────────────────────────────────

  @Put('users/state')
  @UseGuards(NoGuestGuard)
  @NoCache()
  @ApiOperation({ summary: 'Backup user app state (preferences, filters, savedVenues)' })
  @ApiBody({ type: UserStateDto })
  @ApiOkResponse({ description: 'State persisted' })
  @ApiForbiddenResponse({ description: 'Guest users cannot persist state' })
  async saveUserState(
    @CurrentUser() user: User,
    @Body() dto: UserStateDto,
  ) {
    await this.syncService.saveUserState(user.id, dto);
    return { success: true, message: 'State saved successfully' };
  }

  @Get('users/state')
  @UseGuards(NoGuestGuard)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Restore user app state' })
  @ApiOkResponse({ description: 'Previously persisted state or empty defaults' })
  @ApiForbiddenResponse({ description: 'Guest users cannot restore state' })
  async getUserState(@CurrentUser() user: User) {
    const state = await this.syncService.getUserState(user.id);
    return state || { preferences: null, savedVenues: [], lastFilters: null, lastSyncAt: null };
  }
}
