import { Controller, Get, Param, Query, Post, NotFoundException, Req, ParseUUIDPipe, Inject, forwardRef } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { OffersService } from '../offers/offers.service';
import { ErrorCode } from '../../common/enums';
import { CacheTTL, NoCache } from '../../common/interceptors/cache-headers.interceptor';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    @Inject(forwardRef(() => OffersService))
    private readonly offersService: OffersService,
  ) {}

  @Get()
  @CacheTTL(120)
  @ApiOperation({ summary: 'List venues with filters + pagination + personalization' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'atmosphere', required: false, description: 'quiet | lively | packed' })
  @ApiQuery({ name: 'vibe', required: false, description: 'Comma-separated vibe tags' })
  @ApiQuery({ name: 'priceLevel', required: false, type: Number })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'recommended | busyness | distance' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'User latitude for distance calc' })
  @ApiQuery({ name: 'lng', required: false, type: Number, description: 'User longitude for distance calc' })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Max distance in miles (Near Me filter)' })
  @ApiOkResponse({ description: 'Paginated venue list with busyness, vibe, and RAG indicators' })
  async findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('atmosphere') atmosphere?: string,
    @Query('vibe') vibe?: string,
    @Query('priceLevel') priceLevel?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Req() req?: any,
  ) {
    // Get user preferences if authenticated
    const userPreferences = req?.user?.preferences || null;

    const result = await this.venuesService.findAll(
      {
        city,
        category,
        atmosphere,
        vibe,
        priceLevel: priceLevel ? Number(priceLevel) : undefined,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        sort,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        userLat: lat ? Number(lat) : undefined,
        userLng: lng ? Number(lng) : undefined,
        radius: radius ? Number(radius) : undefined,
      },
      userPreferences,
    );

    return {
      ...result,
      city: city || 'Manchester',
    };
  }

  @Get('search')
  @CacheTTL(60)
  @ApiOperation({ summary: 'Search venues by name, area, or tags' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'city', required: false })
  @ApiOkResponse({ description: 'Matching venues with count' })
  async search(@Query('q') q: string, @Query('city') city?: string) {
    const venues = await this.venuesService.search(q, city);
    return { venues, count: venues.length };
  }

  @Get('filter-options')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get available filter options for a city' })
  @ApiQuery({ name: 'city', required: false })
  @ApiOkResponse({ description: 'Categories, atmospheres, vibes, price ranges available' })
  async getFilterOptions(@Query('city') city?: string) {
    return this.venuesService.getFilterOptions(city);
  }

  @Get('trending')
  @CacheTTL(60)
  @ApiOperation({ summary: 'Top 5 trending venues by busyness' })
  @ApiQuery({ name: 'city', required: false })
  @ApiOkResponse({ description: 'Top 5 venues ranked by live busyness' })
  async getTrending(@Query('city') city?: string) {
    return this.venuesService.getTrending(city);
  }

  @Get('map-markers')
  @CacheTTL(120)
  @ApiOperation({ summary: 'Get map marker data with RAG colors and optional viewport bounds' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'User latitude for distance' })
  @ApiQuery({ name: 'lng', required: false, type: Number, description: 'User longitude for distance' })
  @ApiQuery({ name: 'swLat', required: false, type: Number, description: 'Southwest bound latitude' })
  @ApiQuery({ name: 'swLng', required: false, type: Number, description: 'Southwest bound longitude' })
  @ApiQuery({ name: 'neLat', required: false, type: Number, description: 'Northeast bound latitude' })
  @ApiQuery({ name: 'neLng', required: false, type: Number, description: 'Northeast bound longitude' })
  @ApiOkResponse({ description: 'Map markers with RAG color coding' })
  async getMapMarkers(
    @Query('city') city?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('swLat') swLat?: string,
    @Query('swLng') swLng?: string,
    @Query('neLat') neLat?: string,
    @Query('neLng') neLng?: string,
  ) {
    const bounds = swLat && swLng && neLat && neLng
      ? { swLat: Number(swLat), swLng: Number(swLng), neLat: Number(neLat), neLng: Number(neLng) }
      : undefined;

    const markers = await this.venuesService.getMapMarkers(
      city,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      bounds,
    );

    const response: any = { markers };
    if (lat && lng) {
      response.userLocation = { lat: Number(lat), lng: Number(lng) };
    }
    return response;
  }

  @Get(':id')
  @CacheTTL(300)
  @ApiOperation({ summary: 'Get venue detail by ID' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiOkResponse({ description: 'Full venue detail with live stats' })
  @ApiNotFoundResponse({ description: 'Venue not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const venue = await this.venuesService.findById(
      id,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
    if (!venue) {
      throw new NotFoundException({
        code: ErrorCode.VENUE_NOT_FOUND,
        message: 'Venue not found',
      });
    }
    return venue;
  }

  @Get(':id/whats-on')
  @CacheTTL(30)
  @ApiOperation({ summary: "Get active What's On updates for a venue" })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: "Active What's On updates" })
  async getWhatsOn(@Param('id', ParseUUIDPipe) id: string) {
    const updates = await this.venuesService.getWhatsOn(id);
    if (!updates) throw new NotFoundException({ code: ErrorCode.VENUE_NOT_FOUND, message: 'Venue not found' });
    return updates;
  }

  @Post(':id/view')
  @NoCache()
  @ApiOperation({ summary: 'Track venue view' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiCreatedResponse({ description: 'View tracked (increments totalViews)' })
  async trackView(@Param('id', ParseUUIDPipe) id: string) {
    await this.venuesService.trackView(id);
    return { success: true };
  }

  @Get(':id/offers')
  @CacheTTL(120)
  @ApiOperation({ summary: 'Get all offers for a specific venue' })
  @ApiParam({ name: 'id', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'List of offers for the venue' })
  @ApiNotFoundResponse({ description: 'Venue not found' })
  async getVenueOffers(@Param('id', ParseUUIDPipe) id: string) {
    const venue = await this.venuesService.findById(id);
    if (!venue) {
      throw new NotFoundException({
        code: ErrorCode.VENUE_NOT_FOUND,
        message: 'Venue not found',
      });
    }

    const offers = await this.offersService.findByVenueId(id);
    
    const enrichedOffers = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      type: offer.type,
      validDays: offer.validDays,
      validTimeStart: offer.validTimeStart,
      validTimeEnd: offer.validTimeEnd,
      savingValue: Number(offer.savingValue) || 0,
      currency: 'GBP',
      status: this.offersService.getOfferStatus(offer),
      isActive: offer.isActive,
      isAvailableNow: this.offersService.isOfferAvailableNow(offer),
      expiresAt: offer.expiresAt,
    }));

    return {
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
      },
      offers: enrichedOffers,
      count: enrichedOffers.length,
    };
  }
}
