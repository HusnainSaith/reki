import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../../common/enums';
import { PushService } from '../push/push.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Record<string, jest.Mock>;
  let pushService: Partial<PushService>;

  const mockNotification: Partial<Notification> = {
    id: 'n-1',
    userId: 'user-1',
    type: NotificationType.WELCOME,
    title: 'Welcome to REKI!',
    message: 'Start exploring',
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    pushService = {
      sendToUser: jest.fn().mockResolvedValue({ sent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('findByUserId', () => {
    it('should return notifications for user', async () => {
      repo.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const result = await service.findByUserId('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findGroupedByUserId', () => {
    it('should group notifications by today/yesterday/earlier', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const earlier = new Date(today);
      earlier.setDate(earlier.getDate() - 5);

      repo.findAndCount.mockResolvedValue([
        [
          { ...mockNotification, id: 'n-1', createdAt: today },
          { ...mockNotification, id: 'n-2', createdAt: yesterday },
          { ...mockNotification, id: 'n-3', createdAt: earlier },
        ],
        3,
      ]);

      const result = await service.findGroupedByUserId('user-1');
      expect(result.today).toHaveLength(1);
      expect(result.yesterday).toHaveLength(1);
      expect(result.earlier).toHaveLength(1);
    });

    it('should handle empty notifications', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findGroupedByUserId('user-1');
      expect(result.today).toHaveLength(0);
      expect(result.yesterday).toHaveLength(0);
      expect(result.earlier).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      repo.update.mockResolvedValue({ affected: 1 });
      await service.markAsRead('n-1');
      expect(repo.update).toHaveBeenCalledWith('n-1', { isRead: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      repo.update.mockResolvedValue({ affected: 3 });
      await service.markAllAsRead('user-1');
      expect(repo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const data = {
        userId: 'user-1',
        type: NotificationType.VIBE_ALERT,
        title: 'Vibe Alert!',
        message: 'Albert Hall is peaking!',
        venueId: 'v-1',
      };
      repo.create.mockReturnValue(data);
      repo.save.mockResolvedValue({ ...data, id: 'n-new' });

      const result = await service.createNotification(data);
      expect(result.id).toBe('n-new');
      expect(repo.create).toHaveBeenCalledWith(data);
    });
  });

  describe('createWelcomeNotification', () => {
    it('should create a welcome notification with correct content', async () => {
      repo.create.mockReturnValue(mockNotification);
      repo.save.mockResolvedValue(mockNotification);

      await service.createWelcomeNotification('user-1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.WELCOME,
          title: expect.stringContaining('Welcome'),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all notifications with count', async () => {
      repo.find.mockResolvedValue([mockNotification, mockNotification]);
      const result = await service.findAll();
      expect(result.notifications).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });
});
