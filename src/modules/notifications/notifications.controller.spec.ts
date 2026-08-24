import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: Partial<NotificationsService>;
  const user = { id: 'u-1' } as any;

  beforeEach(() => {
    service = {
      findGroupedByUserId: jest.fn().mockResolvedValue({ today: [], yesterday: [], earlier: [] }),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
    };
    controller = new NotificationsController(service as NotificationsService);
  });

  it('findAll returns grouped notifications', async () => {
    const result = await controller.findAll(user);
    expect(service.findGroupedByUserId).toHaveBeenCalledWith('u-1', 1, 20);
    expect(result).toHaveProperty('today');
  });

  it('markAsRead', async () => {
    const result = await controller.markAsRead('n-1');
    expect(service.markAsRead).toHaveBeenCalledWith('n-1');
    expect(result.success).toBe(true);
  });

  it('markAllAsRead', async () => {
    const result = await controller.markAllAsRead(user);
    expect(service.markAllAsRead).toHaveBeenCalledWith('u-1');
    expect(result.success).toBe(true);
  });
});
