import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotFoundException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let service: Partial<AdminService>;

  beforeEach(() => {
    service = {
      getStats: jest.fn().mockResolvedValue({ users: 10, venues: 15 }),
      getUsers: jest.fn().mockResolvedValue({ users: [], total: 0, page: 1 }),
      getUserActivity: jest.fn().mockResolvedValue({ user: { id: '1' } }),
      getVenues: jest.fn().mockResolvedValue({ venues: [], total: 0 }),
      getVenueLogs: jest.fn().mockResolvedValue({ logs: [] }),
      getAllOffers: jest.fn().mockResolvedValue({ offers: [], total: 0 }),
      getRedemptionLogs: jest.fn().mockResolvedValue({ redemptions: [], total: 0 }),
      getActivityLogs: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
      getNotifications: jest.fn().mockResolvedValue({ notifications: [], total: 0 }),
    };
    const pushService = { sendToUser: jest.fn(), sendToUsers: jest.fn() };
    controller = new AdminController(service as AdminService, pushService as any);
  });

  it('getStats', async () => {
    await controller.getStats();
    expect(service.getStats).toHaveBeenCalled();
  });

  it('getUsers with pagination', async () => {
    await controller.getUsers('2', '10');
    expect(service.getUsers).toHaveBeenCalledWith(2, 10);
  });

  it('getUsers defaults', async () => {
    await controller.getUsers();
    expect(service.getUsers).toHaveBeenCalledWith(1, 20);
  });

  it('getUserActivity', async () => {
    await controller.getUserActivity('u-1');
    expect(service.getUserActivity).toHaveBeenCalledWith('u-1');
  });

  it('getUserActivity throws NotFoundException when null', async () => {
    (service.getUserActivity as jest.Mock).mockResolvedValue(null);
    await expect(controller.getUserActivity('u-1')).rejects.toThrow(NotFoundException);
  });

  it('getVenues with pagination', async () => {
    await controller.getVenues('3', '5');
    expect(service.getVenues).toHaveBeenCalledWith(3, 5);
  });

  it('getVenueLogs', async () => {
    await controller.getVenueLogs('v-1');
    expect(service.getVenueLogs).toHaveBeenCalledWith('v-1');
  });

  it('getAllOffers', async () => {
    await controller.getAllOffers('1', '20');
    expect(service.getAllOffers).toHaveBeenCalledWith(1, 20);
  });

  it('getRedemptionLogs', async () => {
    await controller.getRedemptionLogs();
    expect(service.getRedemptionLogs).toHaveBeenCalledWith(1, 20);
  });

  it('getActivityLogs', async () => {
    await controller.getActivityLogs();
    expect(service.getActivityLogs).toHaveBeenCalledWith(1, 50);
  });

  it('getNotifications', async () => {
    await controller.getNotifications();
    expect(service.getNotifications).toHaveBeenCalledWith(1, 20);
  });
});
