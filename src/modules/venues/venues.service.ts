import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { VenueLiveUpdate } from '../worker/entities/venue-live-update.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { haversineDistance, formatDistance, getBusynessColor, generateSocialProof, estimateWalkingTime, getNavigationLinks } from '../../common/utils/distance.util';

interface VenueFilters {
  category?: string;
  atmosphere?: string;
  vibe?: string;
  priceLevel?: number;
  priceMin?: number;
  priceMax?: number;
  city?: string;
  sort?: string;
  page?: number;
  limit?: number;
  userLat?: number;
  userLng?: number;
  radius?: number;
}

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private venuesRepository: Repository<Venue>,
    @InjectRepository(VenueAnalytics)
    private analyticsRepository: Repository<VenueAnalytics>,
    @Optional() @InjectRepository(VenueLiveUpdate)
    private liveUpdatesRepository: Repository<VenueLiveUpdate>,
  ) {}

  async getWhatsOn(venueId: string) {
    if (!this.liveUpdatesRepository) return null;
    const venue = await this.venuesRepository.findOne({ where: { id: venueId } });
    if (!venue) return null;
    return this.liveUpdatesRepository.find({
      where: { venueId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(filters?: VenueFilters, userPreferences?: { vibes: string[]; music: string[] }): Promise<{
    venues: any[];
    count: number;
    pagination?: { page: number; limit: number; total: number; pages: number };
  }> {
    const qb = this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoinAndSelect('venue.vibe', 'vibe')
      .leftJoinAndSelect('venue.offers', 'offers')
      .leftJoin('venue.cityRecord', 'cityRecord');

    // City filter (default Manchester)
    const city = filters?.city || 'Manchester';
    qb.andWhere('LOWER(cityRecord.slug) = LOWER(:city)', { city: city.toLowerCase() });

    // Category filter
    if (filters?.category) {
      qb.andWhere('venue.category = :category', { category: filters.category });
    }

    // Price level filter (exact)
    if (filters?.priceLevel) {
      qb.andWhere('venue.priceLevel = :priceLevel', { priceLevel: filters.priceLevel });
    }

    // Price range filter
    if (filters?.priceMin) {
      qb.andWhere('venue.priceLevel >= :priceMin', { priceMin: filters.priceMin });
    }
    if (filters?.priceMax) {
      qb.andWhere('venue.priceLevel <= :priceMax', { priceMax: filters.priceMax });
    }

    // Atmosphere filter (maps to busyness percentage)
    if (filters?.atmosphere) {
      switch (filters.atmosphere.toLowerCase()) {
        case 'quiet':
          qb.andWhere('busyness.percentage <= 33');
          break;
        case 'lively':
          qb.andWhere('busyness.percentage >= 34 AND busyness.percentage <= 66');
          break;
        case 'packed':
          qb.andWhere('busyness.percentage >= 67');
          break;
      }
    }

    // Vibe tags filter
    if (filters?.vibe) {
      const vibes = filters.vibe.split(',').map((v) => v.trim());
      qb.andWhere('vibe.tags && :vibes', { vibes });
    }

    // Get total count before pagination
    const total = await qb.getCount();

    // Sorting
    if (filters?.sort === 'busyness') {
      qb.orderBy('busyness.percentage', 'DESC');
    } else {
      // Default: recommended (will be re-sorted below if personalized)
      qb.orderBy('busyness.percentage', 'DESC');
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const venues = await qb.getMany();

    // Compute isLive + active offer + distance + busyness color + social proof
    const userLat = filters?.userLat;
    const userLng = filters?.userLng;

    let enrichedVenues: any[] = venues.map((v) => {
      const busynessPercentage = v.busyness?.percentage || 0;
      const mapped: any = {
        ...v,
        isLive: this.isVenueLive(v),
        busynessColor: getBusynessColor(busynessPercentage),
        ragColor: getBusynessColor(busynessPercentage),
        socialProof: generateSocialProof(busynessPercentage),
      };

      // Calculate distance if user coordinates provided
      if (userLat && userLng && v.lat && v.lng) {
        const dist = haversineDistance(userLat, userLng, v.lat, v.lng);
        mapped.distance = formatDistance(dist);
        mapped.distanceMiles = Math.round(dist * 10) / 10;
        mapped.walkingTime = estimateWalkingTime(dist);
        mapped.navigation = getNavigationLinks(v.lat, v.lng);
      }

      // Attach first active offer as activeOffer
      if (v.offers && v.offers.length > 0) {
        const activeOffer = v.offers.find((o) => o.isActive);
        if (activeOffer) {
          mapped.activeOffer = {
            id: activeOffer.id,
            title: activeOffer.title,
            type: activeOffer.type,
          };
        }
      }
      return mapped;
    });

    // Radius filter — only keep venues within X miles
    if (filters?.radius && userLat && userLng) {
      enrichedVenues = enrichedVenues.filter((v) => v.distanceMiles !== undefined && v.distanceMiles <= filters.radius);
    }

    // Distance sorting
    if (filters?.sort === 'distance' && userLat && userLng) {
      enrichedVenues.sort((a, b) => (a.distanceMiles || 999) - (b.distanceMiles || 999));
    } else if (userPreferences && (userPreferences.vibes?.length || userPreferences.music?.length)) {
      // Personalized sorting (if user has preferences)
      enrichedVenues = this.sortByPreferences(enrichedVenues, userPreferences);
    }

    return {
      venues: enrichedVenues,
      count: enrichedVenues.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private sortByPreferences(
    venues: Venue[],
    preferences: { vibes: string[]; music: string[] },
  ): Venue[] {
    return venues
      .map((v) => {
        let matchScore = 0;
        const vibeTags = v.vibe?.tags || [];
        const musicGenres = v.vibe?.musicGenre || [];

        // Vibe matches (weight: 2)
        for (const vibe of preferences.vibes) {
          if (vibeTags.some((t) => t.toLowerCase() === vibe.toLowerCase())) {
            matchScore += 2;
          }
        }

        // Music matches (weight: 1)
        for (const music of preferences.music) {
          if (musicGenres.some((g: string) => g.toLowerCase() === music.toLowerCase())) {
            matchScore += 1;
          }
        }

        return { venue: v, matchScore };
      })
      .sort((a, b) => {
        // Sort by matchScore DESC, then busyness DESC
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (b.venue.busyness?.percentage || 0) - (a.venue.busyness?.percentage || 0);
      })
      .map((item) => item.venue);
  }

  async search(query: string, city?: string): Promise<Venue[]> {
    const qb = this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoinAndSelect('venue.vibe', 'vibe')
      .leftJoin('venue.cityRecord', 'cityRecord');

    const searchCity = city || 'Manchester';
    qb.andWhere('LOWER(cityRecord.slug) = LOWER(:city)', { city: searchCity.toLowerCase() });

    qb.andWhere(
      '(LOWER(venue.name) LIKE LOWER(:q) OR LOWER(venue.area) LIKE LOWER(:q) OR venue.tags::text ILIKE :q)',
      { q: `%${query}%` },
    );

    const venues = await qb.getMany();
    return venues.map((v) => ({ ...v, isLive: this.isVenueLive(v) }));
  }

  async getFilterOptions(city?: string) {
    const searchCity = city || 'Manchester';
    const venues = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoin('venue.cityRecord', 'cityRecord')
      .where('LOWER(cityRecord.slug) = LOWER(:city)', { city: searchCity })
      .select('venue.priceLevel', 'priceLevel')
      .getRawMany();

    const vibes = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoin('venue.vibe', 'vibe')
      .leftJoin('venue.cityRecord', 'cityRecord')
      .where('LOWER(cityRecord.slug) = LOWER(:city)', { city: searchCity.toLowerCase() })
      .select('DISTINCT unnest(vibe.tags)', 'tag')
      .getRawMany();

    const priceLevels = venues.map((v) => v.priceLevel);

    return {
      atmospheres: ['Quiet', 'Lively', 'Packed'],
      vibes: vibes.map((v) => v.tag).filter(Boolean),
      priceRange: {
        min: priceLevels.length > 0 ? Math.min(...priceLevels) : 1,
        max: priceLevels.length > 0 ? Math.max(...priceLevels) : 4,
      },
    };
  }

  async findById(id: string, userLat?: number, userLng?: number): Promise<any | null> {
    const venue = await this.venuesRepository.findOne({
      where: { id },
      relations: ['busyness', 'vibe', 'offers'],
    });
    if (!venue) return null;

    const busynessPercentage = venue.busyness?.percentage || 0;
    const enriched: any = {
      ...venue,
      isLive: this.isVenueLive(venue),
      busynessColor: getBusynessColor(busynessPercentage),
      socialProof: generateSocialProof(busynessPercentage),
    };

    if (userLat && userLng && venue.lat && venue.lng) {
      const dist = haversineDistance(userLat, userLng, venue.lat, venue.lng);
      enriched.distance = formatDistance(dist);
      enriched.distanceMiles = Math.round(dist * 10) / 10;
      enriched.walkingTime = estimateWalkingTime(dist);
      enriched.navigation = getNavigationLinks(venue.lat, venue.lng);
    }

    // Always include navigation links if venue has coordinates
    if (venue.lat && venue.lng && !enriched.navigation) {
      enriched.navigation = getNavigationLinks(venue.lat, venue.lng);
    }

    return enriched;
  }

  /**
   * Get map marker data for all venues.
   * Supports viewport bounds filtering and user distance.
   */
  async getMapMarkers(
    city?: string,
    userLat?: number,
    userLng?: number,
    bounds?: { swLat: number; swLng: number; neLat: number; neLng: number },
  ): Promise<any[]> {
    const venues = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoinAndSelect('venue.vibe', 'vibe')
      .leftJoinAndSelect('venue.offers', 'offers')
      .leftJoin('venue.cityRecord', 'cityRecord')
      .where('LOWER(cityRecord.slug) = LOWER(:city)', { city: (city || 'Manchester').toLowerCase() })
      .getMany();

    let markers = venues.map((v) => {
      const busynessPercentage = v.busyness?.percentage || 0;
      const hasActiveOffer = v.offers?.some((o) => o.isActive) || false;
      const marker: any = {
        venueId: v.id,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        busynessLevel: v.busyness?.level || 'quiet',
        busynessPercentage,
        busynessColor: getBusynessColor(busynessPercentage),
        ragColor: getBusynessColor(busynessPercentage),
        vibeLabel: v.vibe?.tags?.[0] || '',
        category: v.category,
        isLive: this.isVenueLive(v),
        hasActiveOffer,
      };

      if (userLat && userLng && v.lat && v.lng) {
        const dist = haversineDistance(userLat, userLng, v.lat, v.lng);
        marker.distance = formatDistance(dist);
        marker.distanceMiles = Math.round(dist * 10) / 10;
      }

      return marker;
    });

    // Filter by viewport bounds if provided
    if (bounds) {
      markers = markers.filter((m) =>
        m.lat >= bounds.swLat && m.lat <= bounds.neLat &&
        m.lng >= bounds.swLng && m.lng <= bounds.neLng,
      );
    }

    return markers;
  }

  /**
   * Get trending venues — top 5 by busyness percentage.
   */
  async getTrending(city?: string): Promise<Venue[]> {
    return this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoinAndSelect('venue.vibe', 'vibe')
      .leftJoin('venue.cityRecord', 'cityRecord')
      .where('LOWER(cityRecord.slug) = LOWER(:city)', { city: (city || 'Manchester').toLowerCase() })
      .orderBy('busyness.percentage', 'DESC')
      .limit(5)
      .getMany();
  }

  /**
   * Check if venue is currently live.
   * A venue is live if current time is between openingHours and closingTime.
   */
  isVenueLive(venue: Venue): boolean {
    if (!venue.openingHours || !venue.closingTime) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Handle overnight venues (e.g., opens 22:00, closes 05:00)
    if (venue.openingHours > venue.closingTime) {
      return currentTime >= venue.openingHours || currentTime <= venue.closingTime;
    }

    return currentTime >= venue.openingHours && currentTime <= venue.closingTime;
  }

  /**
   * Track a venue view (increment totalViews in today's analytics).
   */
  async trackView(venueId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let analytics = await this.analyticsRepository.findOne({
      where: { venueId, date: today },
    });
    if (!analytics) {
      analytics = this.analyticsRepository.create({ venueId, date: today, totalViews: 0 });
    }
    analytics.totalViews = (analytics.totalViews || 0) + 1;
    await this.analyticsRepository.save(analytics);
  }
}
