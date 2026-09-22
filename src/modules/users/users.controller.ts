import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  ApiBadRequestResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards';
import { NoGuestGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import { User } from './entities/user.entity';
import { UpdateCityDto, UpdateLocaleDto, UpdatePreferencesDto, UpdateProfileDto } from './dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiOkResponse({ description: 'User preferences (vibes + music tags)' })
  async getPreferences(@CurrentUser() user: User) {
    return this.usersService.getPreferences(user.id);
  }

  @Post('preferences')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Save user preferences (onboarding)' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiCreatedResponse({ description: 'Preferences saved' })
  @ApiBadRequestResponse({ description: 'Invalid tag IDs' })
  @ApiForbiddenResponse({ description: 'Guest users cannot save preferences' })
  async savePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.savePreferences(user.id, dto.vibes, dto.music);
  }

  @Put('preferences')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiOkResponse({ description: 'Preferences updated' })
  @ApiForbiddenResponse({ description: 'Guest users cannot update preferences' })
  async updatePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.savePreferences(user.id, dto.vibes, dto.music);
  }

  @Put('city')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Set the current city preference' })
  @ApiBody({ type: UpdateCityDto })
  async setCity(@CurrentUser() user: User, @Body() dto: UpdateCityDto) {
    return this.usersService.setSelectedCity(user.id, dto.city);
  }

  @Get('location/city')
  @ApiOperation({ summary: 'Get the city resolved from the current location' })
  async getLocationCity(@CurrentUser() user: User) {
    return this.usersService.getLocationCity(user.id);
  }

  @Post('location/city')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Set the current city preference' })
  @ApiBody({ type: UpdateCityDto })
  async postLocationCity(@CurrentUser() user: User, @Body() dto: UpdateCityDto) {
    return this.usersService.setSelectedCity(user.id, dto.city);
  }

  @Put('locale')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Set locale and timezone preferences' })
  @ApiBody({ type: UpdateLocaleDto })
  async setLocale(@CurrentUser() user: User, @Body() dto: UpdateLocaleDto) {
    return this.usersService.setLocale(user.id, dto.locale, dto.timezone);
  }

  @Get('saved-venues')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Get saved venues list' })
  @ApiOkResponse({ description: 'Array of saved venues with full detail' })
  @ApiForbiddenResponse({ description: 'Guest users cannot access saved venues' })
  async getSavedVenues(@CurrentUser() user: User) {
    return this.usersService.getSavedVenues(user.id);
  }

  @Post('saved-venues/:venueId')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Save a venue' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID to save', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Venue saved to user bookmarks' })
  @ApiForbiddenResponse({ description: 'Guest users cannot save venues' })
  async saveVenue(@CurrentUser() user: User, @Param('venueId') venueId: string) {
    return this.usersService.saveVenue(user.id, venueId);
  }

  @Delete('saved-venues/:venueId')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Unsave a venue' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID to unsave', format: 'uuid' })
  @ApiOkResponse({ description: 'Venue removed from bookmarks' })
  @ApiForbiddenResponse({ description: 'Guest users cannot modify saved venues' })
  async unsaveVenue(@CurrentUser() user: User, @Param('venueId') venueId: string) {
    return this.usersService.unsaveVenue(user.id, venueId);
  }

  @Get('redemptions')
  @UseGuards(NoGuestGuard)
  @ApiOperation({ summary: 'Get redemption history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated list of past redemptions' })
  @ApiForbiddenResponse({ description: 'Guest users cannot access redemption history' })
  async getRedemptions(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getRedemptions(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile with location' })
  @ApiOkResponse({ description: 'User profile including location data, preferences, and saved venues count' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(NoGuestGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile (name, phone, avatar, location)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Alex Johnson' },
        phone: { type: 'string', example: '+447911123456' },
        currentLat: { type: 'number', example: 53.4808, description: 'Current latitude' },
        currentLng: { type: 'number', example: -2.2426, description: 'Current longitude' },
        locationEnabled: { type: 'boolean', example: true, description: 'Enable location tracking' },
        backgroundLocationEnabled: { type: 'boolean', example: false, description: 'Enable background location' },
        avatar: { type: 'string', format: 'binary', description: 'Profile image (jpg/png/webp, max 5MB)' },
      },
    },
  })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiForbiddenResponse({ description: 'Guest users cannot update profile' })
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let avatarUrl: string | undefined;
    if (file) {
      const { url } = await this.uploadService.uploadImage(file, 'avatars');
      avatarUrl = url;
    }
    return this.usersService.updateProfile(
      user.id,
      dto.name,
      dto.phone,
      avatarUrl,
      dto.currentLat,
      dto.currentLng,
      dto.locationEnabled,
      dto.backgroundLocationEnabled,
    );
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account (GDPR — permanent)' })
  @ApiOkResponse({ description: 'Account deleted successfully' })
  async deleteAccount(@CurrentUser() user: User) {
    return this.usersService.deleteAccount(user.id);
  }
}
