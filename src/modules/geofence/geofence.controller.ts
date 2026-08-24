import { Controller, Post, Put, Get, Body, Query, UseGuards } from '@nestjs/common';
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
import { GeofenceService } from './geofence.service';
import { GeofenceCheckDto, UpdateLocationDto, UpdateLocationConsentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { NoGuestGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';

@ApiTags('Location & Geofence')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@Controller()
@UseGuards(JwtAuthGuard)
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Post('users/location')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Update user GPS location' })
  @ApiBody({ type: UpdateLocationDto })
  @ApiCreatedResponse({ description: 'Location stored (currentLat/Lng + lastSeenAt)' })
  @ApiForbiddenResponse({ description: 'Guest users cannot share location' })
  async updateLocation(@CurrentUser() user: User, @Body() dto: UpdateLocationDto) {
    return this.geofenceService.updateUserLocation(user.id, dto.lat, dto.lng);
  }

  @Put('users/location-consent')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Update location permission consent' })
  @ApiBody({ type: UpdateLocationConsentDto })
  @ApiOkResponse({ description: 'Consent flags updated' })
  @ApiForbiddenResponse({ description: 'Guest users cannot set consent' })
  async updateLocationConsent(@CurrentUser() user: User, @Body() dto: UpdateLocationConsentDto) {
    return this.geofenceService.updateLocationConsent(
      user.id,
      dto.locationEnabled,
      dto.backgroundLocationEnabled,
    );
  }

  @Post('geofence/check')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Check proximity to venues (200m radius) and trigger notifications' })
  @ApiBody({ type: GeofenceCheckDto })
  @ApiCreatedResponse({ description: 'Array of nearby venues + triggered proximity alerts' })
  @ApiForbiddenResponse({ description: 'Guest users cannot use geofence' })
  async checkGeofence(@CurrentUser() user: User, @Body() dto: GeofenceCheckDto) {
    return this.geofenceService.checkGeofence(user.id, dto.lat, dto.lng);
  }

  @Get('analytics/popular-areas')
  @ApiOperation({ summary: 'Get popular neighborhoods with busyness data' })
  @ApiQuery({ name: 'city', required: false })
  @ApiOkResponse({ description: 'Neighborhood areas ranked by activity' })
  async getPopularAreas(@Query('city') city?: string) {
    return this.geofenceService.getPopularAreas(city);
  }
}
