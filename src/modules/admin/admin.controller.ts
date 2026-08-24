import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PushService } from '../push/push.service';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role, NotificationType } from '../../common/enums';
import { TestPushDto } from './dto/test-push.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pushService: PushService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform overview stats (admin only)' })
  @ApiOkResponse({ description: 'Platform-wide counters (users, venues, offers, redemptions)' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/location')
  @ApiOperation({ summary: 'Get location-related stats (admin only)' })
  @ApiOkResponse({ description: 'Geofence + location-sharing stats' })
  async getLocationStats() {
    return this.adminService.getLocationStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated user list' })
  async getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get single user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'User detail' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.getUserById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Get user activity — login history, redemptions (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'User activity detail' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserActivity(@Param('id') id: string) {
    const result = await this.adminService.getUserActivity(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return result;
  }

  // ─── WEEK 4 ADMIN ENDPOINTS ───────────────────────────

  @Get('venues')
  @ApiOperation({ summary: 'List all venues with status (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated venue list with admin status' })
  async getVenues(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getVenues(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('venues/:id/logs')
  @ApiOperation({ summary: 'Get busyness/vibe update logs for a venue (admin only)' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Time-series logs of status updates' })
  async getVenueLogs(@Param('id') id: string) {
    return this.adminService.getVenueLogs(id);
  }

  @Get('offers')
  @ApiOperation({ summary: 'List all offers across venues (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated cross-venue offer list' })
  async getAllOffers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAllOffers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('offers/redemptions')
  @ApiOperation({ summary: 'Get redemption logs (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated redemption log entries' })
  async getRedemptionLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getRedemptionLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'Get all activity logs (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated activity/audit logs' })
  async getActivityLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getActivityLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get all notification logs (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated notification dispatch log' })
  async getNotifications(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getNotifications(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('stats/realtime')
  @ApiOperation({ summary: 'Get real-time stats — WebSocket connections, push analytics (admin only)' })
  @ApiOkResponse({ description: 'WS connections + push dispatch stats' })
  async getRealTimeStats() {
    return this.adminService.getRealTimeStats();
  }

  @Get('stats/offline')
  @ApiOperation({ summary: 'Get offline sync stats (admin only)' })
  @ApiOkResponse({ description: 'Sync queue + delta sync aggregate stats' })
  async getOfflineStats() {
    return this.adminService.getOfflineStats();
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Send a test push notification to a user (admin only)' })
  @ApiBody({ type: TestPushDto })
  @ApiCreatedResponse({ description: 'Test push dispatched (or queued if Firebase not configured)' })
  async testPush(
    @Body() body: TestPushDto,
  ) {
    const result = await this.pushService.sendToUser(
      body.userId,
      NotificationType.VIBE_ALERT,
      {
        title: body.title || '🔔 REKI Test Notification',
        body: body.body || 'This is a test push from REKI admin panel',
        data: { type: 'TEST', timestamp: new Date().toISOString() },
      },
    );
    return {
      ...result,
      firebaseConfigured: this.pushService.isConfigured(),
      pushStats: this.pushService.getStats(),
    };
  }
}
