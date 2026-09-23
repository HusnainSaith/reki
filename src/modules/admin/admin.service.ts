import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { BusinessUser } from '../business/entities/business-user.entity';
import { GeofenceLog } from '../geofence/entities/geofence-log.entity';
import { Device } from '../devices/entities/device.entity';
import { City } from '../cities/entities/city.entity';
import { paginate } from '../../common/dto';
import { PushService } from '../push/push.service';
import { LiveGateway } from '../live/live.gateway';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Venue)
    private venuesRepository: Repository<Venue>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Redemption)
    private redemptionsRepository: Repository<Redemption>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    @InjectRepository(BusinessUser)
    private businessUsersRepository: Repository<BusinessUser>,
    @InjectRepository(GeofenceLog)
    private geofenceLogsRepository: Repository<GeofenceLog>,
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
    private pushService: PushService,
    private liveGateway: LiveGateway,
    private syncService: SyncService,
  ) {}

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalVenues, activeOffers, redemptionsToday, newSignupsToday, liveVenuesNow] =
      await Promise.all([
        this.usersRepository.count(),
        this.venuesRepository.count(),
        this.offersRepository.count({ where: { isActive: true } }),
        this.redemptionsRepository
          .createQueryBuilder('r')
          .where('r.redeemedAt >= :todayStart', { todayStart })
          .getCount(),
        this.usersRepository
          .createQueryBuilder('u')
          .where('u.createdAt >= :todayStart', { todayStart })
          .getCount(),
        this.venuesRepository.count(),
      ]);

    return {
      totalUsers,
      totalVenues,
      activeOffers,
      redemptionsToday,
      newSignupsToday,
      liveVenuesNow,
    };
  }

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

  async getUsers(page = 1, limit = 20) {
    const [users, total] = await this.usersRepository.findAndCount({
      select: ['id', 'email', 'name', 'role', 'authProvider', 'isVerified', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, ...paginate(users, total, page, limit).pagination };
  }

  async getUserById(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'authProvider', 'isVerified', 'isActive', 'createdAt', 'locationEnabled', 'backgroundLocationEnabled'],
    });
    return user ?? null;
  }

  async getUserActivity(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) return null;

    const redemptions = await this.redemptionsRepository.find({
      where: { userId },
      relations: ['offer', 'venue'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      user,
      redemptions,
      totalRedemptions: redemptions.length,
    };
  }

  // ─── WEEK 4 ADMIN APIs ────────────────────────────────

  async getVenues(page = 1, limit = 20) {
    const [venues, total] = await this.venuesRepository.findAndCount({
      relations: ['busyness', 'vibe'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        city: v.city,
        category: v.category,
        busynessLevel: v.busyness?.level || 'quiet',
        busynessPercent: v.busyness?.percentage || 0,
        vibes: v.vibe?.tags || [],
        isLive: this.isVenueLive(v),
      })),
      ...paginate(venues, total, page, limit).pagination,
    };
  }

  async getVenueLogs(venueId: string) {
    const logs = await this.activityLogsRepository.find({
      where: { targetId: venueId, target: 'venue' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { logs, count: logs.length };
  }

  async getAllOffers(page = 1, limit = 20) {
    const [offers, total] = await this.offersRepository.findAndCount({
      relations: ['venue'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      offers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        type: o.type,
        venueName: o.venue?.name,
        venueId: o.venueId,
        isActive: o.isActive,
        redemptionCount: o.redemptionCount,
        maxRedemptions: o.maxRedemptions,
        createdAt: o.createdAt,
        expiresAt: o.expiresAt,
      })),
      ...paginate(offers, total, page, limit).pagination,
    };
  }

  async getRedemptionLogs(page = 1, limit = 20) {
    const [redemptions, total] = await this.redemptionsRepository.findAndCount({
      relations: ['user', 'venue', 'offer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      redemptions: redemptions.map((r) => ({
        id: r.id,
        userName: r.user?.name,
        userId: r.userId,
        venueName: r.venue?.name,
        venueId: r.venueId,
        offerTitle: r.offer?.title,
        offerId: r.offerId,
        voucherCode: r.voucherCode,
        transactionId: r.transactionId,
        status: r.status,
        savingValue: Number(r.savingValue),
        currency: r.currency,
        redeemedAt: r.redeemedAt,
        createdAt: r.createdAt,
      })),
      ...paginate(redemptions, total, page, limit).pagination,
    };
  }

  async getActivityLogs(page = 1, limit = 50) {
    const [logs, total] = await this.activityLogsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { logs, ...paginate(logs, total, page, limit).pagination };
  }

  async getNotifications(page = 1, limit = 20) {
    const [notifications, total] = await this.notificationsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        venueId: n.venueId,
        offerId: n.offerId,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      ...paginate(notifications, total, page, limit).pagination,
    };
  }

  private isVenueLive(venue: Venue): boolean {
    if (!venue.openingHours || !venue.closingTime) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (venue.openingHours > venue.closingTime) {
      return currentTime >= venue.openingHours || currentTime <= venue.closingTime;
    }
    return currentTime >= venue.openingHours && currentTime <= venue.closingTime;
  }

  // ─── WEEK 9: Real-Time Stats ──────────────────────────

  async getRealTimeStats() {
    const connectionStats = this.liveGateway.getConnectionStats();
    const pushStats = this.pushService.getStats();
    const activeDevices = await this.devicesRepository.count({ where: { isActive: true } });

    return {
      realTimeStats: {
        activeWebSocketConnections: connectionStats.activeConnections,
        uniqueConnectedUsers: connectionStats.uniqueUsers,
        pushNotificationsSentToday: pushStats.totalSent,
        pushDelivered: pushStats.delivered,
        pushFailed: pushStats.failed,
        pushOpenRate: pushStats.openRate,
        registeredDevices: activeDevices,
        fcmConfigured: this.pushService.isConfigured(),
      },
    };
  }

  // ─── WEEK 10: Offline Sync Stats ─────────────────────

  async getOfflineStats() {
    return this.syncService.getOfflineStats();
  }

  // ─── CITY MANAGEMENT ─────────────────────────────────

  async getCities() {
    return this.citiesRepository.find({ order: { name: 'ASC' } });
  }

  async createCity(data: Partial<City>) {
    const slug = data.slug?.trim().toLowerCase();
    const existing = await this.citiesRepository.findOne({ where: { slug } });
    if (existing) throw new ConflictException(`City with slug "${slug}" already exists`);
    const city = this.citiesRepository.create({
      ...data,
      slug,
      defaultLocale: data.defaultLocale || 'en-GB',
      detectionRadiusKm: data.detectionRadiusKm ?? 50,
      isActive: data.isActive ?? true,
    });
    return this.citiesRepository.save(city);
  }

  async updateCity(id: string, data: Partial<City>) {
    const city = await this.citiesRepository.findOne({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    if (data.slug) data.slug = data.slug.trim().toLowerCase();
    Object.assign(city, data);
    return this.citiesRepository.save(city);
  }

  async deleteCity(id: string) {
    const city = await this.citiesRepository.findOne({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    city.isActive = false;
    await this.citiesRepository.save(city);
    return { success: true, message: 'City deactivated' };
  }
}
