import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
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
import { PushService } from '../push/push.service';
import { LiveGateway } from '../live/live.gateway';
import { SyncService } from '../sync/sync.service';

describe('AdminService', () => {
  let service: AdminService;
  let usersRepo: Record<string, jest.Mock>;
  let venuesRepo: Record<string, jest.Mock>;
  let offersRepo: Record<string, jest.Mock>;
  let redemptionsRepo: Record<string, jest.Mock>;
  let notificationsRepo: Record<string, jest.Mock>;
  let activityLogsRepo: Record<string, jest.Mock>;
  let businessUsersRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    const mockQB = {
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };

    usersRepo = {
      count: jest.fn().mockResolvedValue(10),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };
    venuesRepo = {
      count: jest.fn().mockResolvedValue(15),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };
    offersRepo = {
      count: jest.fn().mockResolvedValue(5),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };
    redemptionsRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };
    notificationsRepo = { find: jest.fn(), findAndCount: jest.fn() };
    activityLogsRepo = { find: jest.fn(), findAndCount: jest.fn() };
    businessUsersRepo = {};

    const geofenceLogsRepo = { count: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Venue), useValue: venuesRepo },
        { provide: getRepositoryToken(Offer), useValue: offersRepo },
        { provide: getRepositoryToken(Redemption), useValue: redemptionsRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationsRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: activityLogsRepo },
        { provide: getRepositoryToken(BusinessUser), useValue: businessUsersRepo },
        { provide: getRepositoryToken(GeofenceLog), useValue: geofenceLogsRepo },
        { provide: getRepositoryToken(Device), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(City), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: PushService, useValue: { getStats: jest.fn().mockReturnValue({ totalSent: 0, delivered: 0, failed: 0, opened: 0, openRate: '0%' }), isConfigured: jest.fn().mockReturnValue(false) } },
        { provide: LiveGateway, useValue: { getConnectionStats: jest.fn().mockReturnValue({ activeConnections: 0, uniqueUsers: 0, venueViewers: {} }) } },
        { provide: SyncService, useValue: { getOfflineStats: jest.fn().mockResolvedValue({ totalSyncActions: 0, pendingSyncActions: 0, successfulSyncs: 0, conflictsToday: 0, rejectedToday: 0, syncSuccessRate: '0.0%', avgSyncDelay: '0 minutes' }) } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      const result = await service.getStats();
      expect(result).toHaveProperty('totalUsers', 10);
      expect(result).toHaveProperty('totalVenues', 15);
      expect(result).toHaveProperty('activeOffers', 5);
      expect(result).toHaveProperty('redemptionsToday');
      expect(result).toHaveProperty('newSignupsToday');
    });
  });

  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      const users = [
        { id: 'u-1', email: 'a@b.com', name: 'A', role: 'user' },
        { id: 'u-2', email: 'c@d.com', name: 'B', role: 'admin' },
      ];
      usersRepo.findAndCount.mockResolvedValue([users, 2]);
      const result = await service.getUsers();
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should respect pagination params', async () => {
      usersRepo.findAndCount.mockResolvedValue([[], 50]);
      const result = await service.getUsers(3, 10);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity with redemptions', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u-1', email: 'test@test.com' });
      redemptionsRepo.find.mockResolvedValue([{ id: 'r-1' }]);
      const result = await service.getUserActivity('u-1');
      expect(result.user.id).toBe('u-1');
      expect(result.totalRedemptions).toBe(1);
    });

    it('should return null for non-existing user', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      expect(await service.getUserActivity('gone')).toBeNull();
    });
  });

  describe('getVenues', () => {
    it('should return paginated venues with busyness and vibe info', async () => {
      venuesRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'v-1',
            name: 'Test Bar',
            address: '123 St',
            city: 'Manchester',
            category: 'bar',
            busyness: { level: 'moderate', percentage: 50 },
            vibe: { tags: ['Chill'] },
            openingHours: '18:00',
            closingTime: '02:00',
          },
        ],
        1,
      ]);
      const result = await service.getVenues();
      expect(result.venues).toHaveLength(1);
      expect(result.venues[0].busynessLevel).toBe('moderate');
      expect(result.total).toBe(1);
    });

    it('should default busyness to quiet if no busyness record', async () => {
      venuesRepo.findAndCount.mockResolvedValue([
        [{ id: 'v-1', name: 'New Bar', busyness: null, vibe: null }],
        1,
      ]);
      const result = await service.getVenues();
      expect(result.venues[0].busynessLevel).toBe('quiet');
      expect(result.venues[0].vibes).toEqual([]);
    });
  });

  describe('getVenueLogs', () => {
    it('should return activity logs for venue', async () => {
      activityLogsRepo.find.mockResolvedValue([{ id: 'l-1', action: 'STATUS_UPDATE' }]);
      const result = await service.getVenueLogs('v-1');
      expect(result.logs).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });

  describe('getAllOffers', () => {
    it('should return paginated mapped offers with venue name', async () => {
      offersRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'o-1',
            title: 'Happy Hour',
            type: '2-for-1',
            venue: { name: 'Test Bar' },
            venueId: 'v-1',
            isActive: true,
            redemptionCount: 5,
            maxRedemptions: 100,
            createdAt: new Date(),
          },
        ],
        1,
      ]);
      const result = await service.getAllOffers();
      expect(result.offers[0].venueName).toBe('Test Bar');
      expect(result.total).toBe(1);
    });
  });

  describe('getRedemptionLogs', () => {
    it('should return paginated mapped redemption logs', async () => {
      redemptionsRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'r-1',
            user: { name: 'Test' },
            venue: { name: 'Bar' },
            offer: { title: 'Deal' },
            userId: 'u-1',
            venueId: 'v-1',
            offerId: 'o-1',
            voucherCode: 'RK-123',
            transactionId: 'REKI-001',
            status: 'redeemed',
            savingValue: 5.5,
            currency: 'GBP',
            redeemedAt: new Date(),
            createdAt: new Date(),
          },
        ],
        1,
      ]);
      const result = await service.getRedemptionLogs();
      expect(result.redemptions[0].userName).toBe('Test');
      expect(result.total).toBe(1);
    });
  });

  describe('getActivityLogs', () => {
    it('should return paginated activity logs', async () => {
      activityLogsRepo.findAndCount.mockResolvedValue([[{ id: 'l-1' }, { id: 'l-2' }], 2]);
      const result = await service.getActivityLogs();
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications mapped', async () => {
      notificationsRepo.findAndCount.mockResolvedValue([
        [{ id: 'n-1', userId: 'u-1', type: 'welcome', title: 'Hi', message: 'msg', isRead: false, createdAt: new Date() }],
        1,
      ]);
      const result = await service.getNotifications();
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });
});
