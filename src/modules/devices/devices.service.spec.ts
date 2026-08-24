import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepo: Record<string, jest.Mock>;
  let prefRepo: Record<string, jest.Mock>;

  const mockPrefs = {
    id: 'pref-1',
    userId: 'user-1',
    vibeAlerts: true,
    livePerformance: true,
    socialCheckins: true,
    offerAlerts: true,
    weeklyRecap: true,
    proximityAlerts: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  };

  beforeEach(async () => {
    deviceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    prefRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useValue: deviceRepo },
        { provide: getRepositoryToken(NotificationPreference), useValue: prefRepo },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  // ─── getPreferences ──────────────────────────────────

  describe('getPreferences', () => {
    it('should return existing preferences when found', async () => {
      prefRepo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(mockPrefs);
      expect(prefRepo.save).not.toHaveBeenCalled();
    });

    it('should create and save default preferences for a regular user', async () => {
      prefRepo.findOne.mockResolvedValue(null);
      const newPrefs = { userId: 'user-1', vibeAlerts: true };
      prefRepo.create.mockReturnValue(newPrefs);
      prefRepo.save.mockResolvedValue({ ...newPrefs, id: 'pref-new' });

      const result = await service.getPreferences('user-1');

      expect(prefRepo.save).toHaveBeenCalledWith(newPrefs);
      expect(result.id).toBe('pref-new');
    });

    it('should return in-memory defaults without throwing when FK constraint fails (business user)', async () => {
      prefRepo.findOne.mockResolvedValue(null);
      const defaultPrefs = { userId: 'biz-1', vibeAlerts: true };
      prefRepo.create.mockReturnValue(defaultPrefs);
      prefRepo.save.mockRejectedValue(
        new Error('insert or update on table "notification_preferences" violates foreign key constraint'),
      );

      // Should NOT throw — returns in-memory defaults instead
      const result = await service.getPreferences('biz-1');

      expect(result.userId).toBe('biz-1');
      expect(result.vibeAlerts).toBe(true);
      expect(result.livePerformance).toBe(true);
      expect(result.offerAlerts).toBe(true);
      expect(result.proximityAlerts).toBe(true);
      expect(result.quietHoursStart).toBeNull();
      expect(result.quietHoursEnd).toBeNull();
    });
  });

  // ─── updatePreferences ───────────────────────────────

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      prefRepo.findOne.mockResolvedValue({ ...mockPrefs });
      prefRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.updatePreferences('user-1', {
        vibeAlerts: false,
        offerAlerts: false,
      } as any);

      expect(result.vibeAlerts).toBe(false);
      expect(result.offerAlerts).toBe(false);
    });

    it('should create new preferences if none exist', async () => {
      prefRepo.findOne.mockResolvedValue(null);
      const created = { userId: 'user-2', vibeAlerts: false };
      prefRepo.create.mockReturnValue(created);
      prefRepo.save.mockResolvedValue({ ...created, id: 'pref-2' });

      const result = await service.updatePreferences('user-2', { vibeAlerts: false } as any);

      expect(result.id).toBe('pref-2');
    });

    it('should return in-memory prefs without throwing when FK constraint fails (business user)', async () => {
      prefRepo.findOne.mockResolvedValue(null);
      const created = { userId: 'biz-1', vibeAlerts: false };
      prefRepo.create.mockReturnValue(created);
      prefRepo.save.mockRejectedValue(
        new Error('insert or update on table "notification_preferences" violates foreign key constraint'),
      );

      const result = await service.updatePreferences('biz-1', { vibeAlerts: false } as any);

      expect(result).toEqual(created);
    });
  });

  // ─── shouldSendPush ──────────────────────────────────

  describe('shouldSendPush', () => {
    it('should return true when notification type is enabled and no quiet hours', async () => {
      prefRepo.findOne.mockResolvedValue({ ...mockPrefs });

      const result = await service.shouldSendPush('user-1', 'vibe_alert');
      expect(result).toBe(true);
    });

    it('should return false when notification type is disabled', async () => {
      prefRepo.findOne.mockResolvedValue({ ...mockPrefs, vibeAlerts: false });

      const result = await service.shouldSendPush('user-1', 'vibe_alert');
      expect(result).toBe(false);
    });

    it('should return false during quiet hours', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      // Set quiet hours to cover current time
      const quietStart = `${String(currentHour - 1).padStart(2, '0')}:00`;
      const quietEnd = `${String(currentHour + 1).padStart(2, '0')}:00`;

      prefRepo.findOne.mockResolvedValue({
        ...mockPrefs,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
      });

      const result = await service.shouldSendPush('user-1', 'offer_confirmation');
      expect(result).toBe(false);
    });
  });

  // ─── registerDevice ──────────────────────────────────

  describe('registerDevice', () => {
    it('should update existing device if fcmToken already registered', async () => {
      const existing = { id: 'dev-1', fcmToken: 'tok-1', userId: 'old-user' };
      deviceRepo.findOne.mockResolvedValue(existing);
      deviceRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.registerDevice('new-user', {
        fcmToken: 'tok-1',
        platform: 'ios',
        deviceId: 'phone-1',
        appVersion: '1.0.0',
      } as any);

      expect(result.userId).toBe('new-user');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create new device if token not found', async () => {
      deviceRepo.findOne.mockResolvedValue(null);
      deviceRepo.create.mockReturnValue({ userId: 'user-1', fcmToken: 'tok-new' });
      deviceRepo.save.mockResolvedValue({ id: 'dev-new', userId: 'user-1', fcmToken: 'tok-new' });

      const result = await service.registerDevice('user-1', {
        fcmToken: 'tok-new',
        platform: 'android',
        deviceId: 'phone-2',
        appVersion: '1.0.0',
      } as any);

      expect(result.id).toBe('dev-new');
    });
  });
});
