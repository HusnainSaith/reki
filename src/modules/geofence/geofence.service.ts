import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { GeofenceLog } from './entities/geofence-log.entity';
import { AreaAnalytics } from './entities/area-analytics.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { haversineDistance } from '../../common/utils/distance.util';
import { NotificationType } from '../../common/enums';

const GEOFENCE_RADIUS_MILES = 0.124; // ~200 meters
const MAX_NOTIFICATIONS_PER_HOUR = 3;
const VENUE_COOLDOWN_HOURS = 4;

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger('GeofenceService');

  constructor(
    @InjectRepository(GeofenceLog)
    private geofenceLogsRepository: Repository<GeofenceLog>,
    @InjectRepository(AreaAnalytics)
    private areaAnalyticsRepository: Repository<AreaAnalytics>,
    @InjectRepository(Venue)
    private venuesRepository: Repository<Venue>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Check if user is near any venues (200m radius) and trigger proximity notifications.
   */
  async checkGeofence(userId: string, lat: number, lng: number) {
    // 1. Find all venues
    const venues = await this.venuesRepository.find({
      relations: ['busyness'],
    });

    // 2. Filter venues within 200m
    const nearbyVenues: any[] = [];
    for (const venue of venues) {
      if (!venue.lat || !venue.lng) continue;
      const dist = haversineDistance(lat, lng, venue.lat, venue.lng);
      if (dist <= GEOFENCE_RADIUS_MILES) {
        nearbyVenues.push({ venue, distanceMiles: dist, distanceMeters: Math.round(dist * 1609.34) });
      }
    }

    if (nearbyVenues.length === 0) {
      return { nearbyVenues: [] };
    }

    // 3. Rate limit check — max 3 notifications per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = await this.geofenceLogsRepository.count({
      where: { userId, notifiedAt: MoreThan(oneHourAgo) },
    });

    if (recentNotifications >= MAX_NOTIFICATIONS_PER_HOUR) {
      this.logger.warn(`User ${userId} hit geofence rate limit (${MAX_NOTIFICATIONS_PER_HOUR}/hour)`);
      return {
        nearbyVenues: nearbyVenues.map((nv) => ({
          venueId: nv.venue.id,
          name: nv.venue.name,
          distance: `${nv.distanceMeters}m`,
          activeOffer: null,
          notificationSent: false,
          reason: 'rate_limited',
        })),
      };
    }

    // 4. Process each nearby venue
    const results: any[] = [];
    for (const nv of nearbyVenues) {
      const { venue, distanceMeters } = nv;

      // Cooldown check — same venue, 4 hours
      const cooldownTime = new Date(Date.now() - VENUE_COOLDOWN_HOURS * 60 * 60 * 1000);
      const recentForVenue = await this.geofenceLogsRepository.findOne({
        where: { userId, venueId: venue.id, notifiedAt: MoreThan(cooldownTime) },
      });

      if (recentForVenue) {
        results.push({
          venueId: venue.id,
          name: venue.name,
          distance: `${distanceMeters}m`,
          activeOffer: null,
          notificationSent: false,
          reason: 'cooldown',
        });
        continue;
      }

      // Check for active offers
      const activeOffer = await this.offersRepository.findOne({
        where: { venueId: venue.id, isActive: true },
        order: { createdAt: 'DESC' },
      });

      // Create notification
      const notification = this.notificationsRepository.create({
        userId,
        type: NotificationType.PROXIMITY_OFFER,
        title: `You're near ${venue.name}!`,
        message: activeOffer
          ? `${activeOffer.title} available. Just ${distanceMeters}m away!`
          : `${venue.name} is just ${distanceMeters}m away. Check it out!`,
        venueId: venue.id,
      });
      await this.notificationsRepository.save(notification);

      // Log geofence event
      const log = this.geofenceLogsRepository.create({
        userId,
        venueId: venue.id,
        distance: distanceMeters,
        offerId: activeOffer?.id || null,
        notifiedAt: new Date(),
      });
      await this.geofenceLogsRepository.save(log);

      results.push({
        venueId: venue.id,
        name: venue.name,
        distance: `${distanceMeters}m`,
        activeOffer: activeOffer ? activeOffer.title : null,
        notificationSent: true,
      });
    }

    return { nearbyVenues: results };
  }

  /**
   * Update user location in the database.
   */
  async updateUserLocation(userId: string, lat: number, lng: number) {
    await this.usersRepository.update(userId, {
      currentLat: lat,
      currentLng: lng,
      locationUpdatedAt: new Date(),
    });
    return { success: true };
  }

  /**
   * Update user location consent settings.
   */
  async updateLocationConsent(userId: string, locationEnabled: boolean, backgroundLocationEnabled?: boolean) {
    const update: any = { locationEnabled };
    if (backgroundLocationEnabled !== undefined) {
      update.backgroundLocationEnabled = backgroundLocationEnabled;
    }
    await this.usersRepository.update(userId, update);
    return { success: true };
  }

  /**
   * Get popular areas/neighborhoods with busyness data.
   */
  async getPopularAreas(city?: string) {
    const searchCity = city || 'Manchester';

    // Group venues by area, calculate aggregate stats
    const areas = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoin('venue.busyness', 'busyness')
      .where('LOWER(venue.city) = LOWER(:city)', { city: searchCity })
      .select('venue.area', 'name')
      .addSelect('COUNT(venue.id)', 'activeVenues')
      .addSelect('ROUND(AVG(busyness.percentage))', 'avgBusyness')
      .groupBy('venue.area')
      .orderBy('"avgBusyness"', 'DESC')
      .getRawMany();

    // Count users with location in each area (approximate — users near area centre)
    return {
      areas: areas.map((a) => ({
        name: a.name,
        activeVenues: parseInt(a.activeVenues, 10),
        avgBusyness: parseInt(a.avgBusyness, 10) || 0,
      })),
    };
  }

  /**
   * Get location-related stats for admin.
   */
  async getLocationStats() {
    const usersWithLocation = await this.usersRepository.count({
      where: { locationEnabled: true },
    });

    const geofenceNotificationsSent = await this.geofenceLogsRepository.count();

    const topAreas = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoin('venue.busyness', 'busyness')
      .select('venue.area', 'name')
      .addSelect('COUNT(venue.id)', 'venueCount')
      .addSelect('ROUND(AVG(busyness.percentage))', 'avgBusyness')
      .groupBy('venue.area')
      .orderBy('"avgBusyness"', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      usersWithLocation,
      geofenceNotificationsSent,
      topAreas: topAreas.map((a) => ({
        name: a.name,
        venueCount: parseInt(a.venueCount, 10),
        avgBusyness: parseInt(a.avgBusyness, 10) || 0,
      })),
    };
  }
}
