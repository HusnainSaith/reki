import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam, ApiBody, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiConsumes } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards';
import { BusinessGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import {
  BusinessLoginDto,
  BusinessRegisterDto,
  UpdateVenueStatusDto,
  CreateOfferDto,
  UpdateOfferDto,
  ToggleOfferDto,
  CreateVenueDto,
} from './dto';
import { ForgotPasswordDto, ResetPasswordDto, LogoutDto } from '../auth/dto';
import { VenueCategory } from '../../common/enums';
import { UpdateLiveInfoDto } from '../worker/dto/update-live-info.dto';

@ApiTags('Business')
@Controller()
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly uploadService: UploadService,
  ) {}

  // ─── AUTH (under /auth/business) ───────────────────────

  @Post('auth/business/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Business login (email/password)' })
  @ApiBody({ type: BusinessLoginDto })
  @ApiOkResponse({ description: 'Business login success — tokens + venue list' })
  @ApiUnauthorizedResponse({ description: 'Invalid business credentials' })
  async login(@Body() dto: BusinessLoginDto) {
    return this.businessService.login(dto.email, dto.password);
  }

  @Post('auth/business/register')
  @ApiOperation({ summary: 'Business registration (create account only)' })
  @ApiBody({ type: BusinessRegisterDto })
  @ApiCreatedResponse({ description: 'Business account created — can now login and create venues' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async register(@Body() dto: BusinessRegisterDto) {
    return this.businessService.register(dto);
  }

  @Post('auth/business/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Business forgot password' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Password reset email dispatched' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.businessService.forgotPassword(dto.email);
  }

  @Post('auth/business/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Business reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Token invalid or expired' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.businessService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('auth/business/logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Business logout' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async businessLogout() {
    // Business refresh tokens are not persisted — logout is client-side
    return { success: true, message: 'Logged out successfully' };
  }

  // ─── VENUE MANAGEMENT ──────────────────────────────────

  @Get('business/profile')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business user profile' })
  @ApiOkResponse({ description: 'Business profile with venue list' })
  async getProfile(@CurrentUser() user: any) {
    return this.businessService.getBusinessProfile(user.id);
  }

  @Put('business/profile')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update business profile (name, phone, avatar)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'The Blue Moon Group' },
        phone: { type: 'string', example: '+447911123456' },
        avatar: { type: 'string', format: 'binary', description: 'Profile image (jpg/png/webp, max 5MB)' },
      },
    },
  })
  @ApiOkResponse({ description: 'Profile updated' })
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: { name?: string; phone?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let avatarUrl: string | undefined;
    if (file) {
      const { url } = await this.uploadService.uploadImage(file, 'avatars');
      avatarUrl = url;
    }
    return this.businessService.updateBusinessProfile(user.id, body.name, body.phone, avatarUrl);
  }

  @Post('business/venues')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new venue' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'address', 'city', 'area', 'category', 'lat', 'lng', 'openingHours', 'closingTime'],
      properties: {
        name: { type: 'string', example: 'The Blue Moon Bar' },
        address: { type: 'string', example: '123 Oxford Road, Manchester' },
        city: { type: 'string', example: 'Manchester' },
        area: { type: 'string', example: 'City Centre' },
        category: { type: 'string', enum: Object.values(VenueCategory), example: 'bar' },
        lat: { type: 'number', example: 53.4808 },
        lng: { type: 'number', example: -2.2426 },
        priceLevel: { type: 'number', example: 2, minimum: 1, maximum: 4 },
        openingHours: { type: 'string', example: '18:00' },
        closingTime: { type: 'string', example: '02:00' },
        tags: { type: 'string', example: '["Chill","Party"]', description: 'JSON array of tags' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files (max 10, 5MB each, jpg/png/webp)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Venue created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async createVenue(
    @CurrentUser() user: any,
    @Body() dto: CreateVenueDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const { url } = await this.uploadService.uploadImage(file, 'venues');
        imageUrls.push(url);
      }
    }
    return this.businessService.createVenue(user.id, { ...dto, images: imageUrls });
  }

  @Get('business/venues')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all my venues' })
  @ApiOkResponse({ description: 'List of venues owned by business user' })
  async getMyVenues(@CurrentUser() user: any) {
    return this.businessService.getMyVenues(user.id);
  }

  @Put('business/venues/:id')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update venue details (with optional new images)' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        area: { type: 'string' },
        category: { type: 'string', enum: Object.values(VenueCategory) },
        lat: { type: 'number' },
        lng: { type: 'number' },
        priceLevel: { type: 'number', minimum: 1, maximum: 4 },
        openingHours: { type: 'string' },
        closingTime: { type: 'string' },
        tags: { type: 'string', description: 'JSON array of tags e.g. ["Chill","Party"]' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'New images to append (max 10, 5MB each)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Venue updated successfully' })
  @ApiForbiddenResponse({ description: 'Not authorized for this venue' })
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateVenue(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const newImageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const { url } = await this.uploadService.uploadImage(file, 'venues');
        newImageUrls.push(url);
      }
    }
    return this.businessService.updateVenue(venueId, user.id, dto, newImageUrls);
  }

  @Put('business/venues/:id/whats-on')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publish a venue's What's On update" })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiBody({ type: UpdateLiveInfoDto })
  @ApiOkResponse({ description: "What's On update published" })
  async updateWhatsOn(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateLiveInfoDto,
  ) {
    return this.businessService.updateWhatsOn(user.id, venueId, dto);
  }

  @Delete('business/venues/:id')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove venue from account' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Venue removed from account' })
  async deleteVenue(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.deleteVenue(venueId, user.id);
  }

  // ─── DASHBOARD ─────────────────────────────────────────

  @Get('business/dashboard/:venueId')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get venue dashboard (stats, vibe, weather)' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Dashboard stats + live indicators for venue' })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  @ApiForbiddenResponse({ description: 'Not authorized for this venue' })
  async getDashboard(
    @Param('venueId') venueId: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.getDashboard(venueId, user.id);
  }

  // ─── ANALYTICS ─────────────────────────────────────────

  @Get('business/analytics/:venueId')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get venue analytics (views, saves, clicks, redemptions)' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID', format: 'uuid' })
  @ApiQuery({ name: 'period', required: false, description: 'today | week | month' })
  @ApiOkResponse({ description: 'Analytics metrics for the period' })
  @ApiForbiddenResponse({ description: 'Not authorized for this venue' })
  async getAnalytics(
    @Param('venueId') venueId: string,
    @CurrentUser() user: any,
    @Query('period') period?: string,
  ) {
    return this.businessService.getAnalytics(venueId, user.id, period);
  }

  // ─── VENUE STATUS ──────────────────────────────────────

  @Put('business/venues/:id/status')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update busyness + vibe (business owner)' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiBody({ type: UpdateVenueStatusDto })
  @ApiOkResponse({ description: 'Venue status updated' })
  @ApiForbiddenResponse({ description: 'Not authorized for this venue' })
  async updateVenueStatus(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateVenueStatusDto,
  ) {
    return this.businessService.updateVenueStatus(venueId, user.id, dto.busyness, dto.vibes);
  }

  @Get('business/venues/:id/status')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current venue status (busyness + vibe)' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Current live busyness + vibe data' })
  async getVenueStatus(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.getVenueStatus(venueId, user.id);
  }

  // ─── OFFERS ────────────────────────────────────────────

  @Get('business/venues/:id/offers')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List venue offers (active + past)' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated offers owned by venue' })
  async getVenueOffers(
    @Param('id') venueId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.businessService.getVenueOffers(
      venueId,
      user.id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Post('business/offers')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new offer' })
  @ApiBody({ type: CreateOfferDto })
  @ApiCreatedResponse({ description: 'Offer created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not authorized for this venue' })
  async createOffer(
    @CurrentUser() user: any,
    @Body() dto: CreateOfferDto,
  ) {
    return this.businessService.createOffer(dto.venueId, user.id, {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      validDays: dto.validDays,
      validTimeStart: dto.validTimeStart,
      validTimeEnd: dto.validTimeEnd,
      maxRedemptions: dto.maxRedemptions || 100,
      savingValue: dto.savingValue,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isAvailableNow: dto.isAvailableNow ?? false,
    } as any);
  }

  @Put('business/offers/:id')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an offer' })
  @ApiParam({ name: 'id', description: 'Offer UUID', format: 'uuid' })
  @ApiBody({ type: UpdateOfferDto })
  @ApiOkResponse({ description: 'Offer updated' })
  @ApiNotFoundResponse({ description: 'Offer not found' })
  @ApiForbiddenResponse({ description: 'Not authorized for this offer' })
  async updateOffer(
    @Param('id') offerId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.businessService.updateOffer(offerId, user.id, dto as any);
  }

  @Put('business/offers/:id/toggle')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle offer active/inactive' })
  @ApiParam({ name: 'id', description: 'Offer UUID', format: 'uuid' })
  @ApiBody({ type: ToggleOfferDto })
  @ApiOkResponse({ description: 'Offer isActive flag toggled' })
  async toggleOffer(
    @Param('id') offerId: string,
    @CurrentUser() user: any,
    @Body() dto: ToggleOfferDto,
  ) {
    return this.businessService.toggleOffer(offerId, user.id, dto.isActive);
  }

  @Delete('business/offers/:id')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an offer (soft delete)' })
  @ApiParam({ name: 'id', description: 'Offer UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Offer soft-deleted' })
  @ApiNotFoundResponse({ description: 'Offer not found' })
  async deleteOffer(
    @Param('id') offerId: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.deleteOffer(offerId, user.id);
  }
}
