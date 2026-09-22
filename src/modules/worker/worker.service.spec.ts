import { ForbiddenException } from '@nestjs/common';
import { BusinessRole, BusynessLevel } from '../../common/enums';
import { WorkerService } from './worker.service';

describe('WorkerService Phase 6', () => {
  const businessUsers = { findOne: jest.fn(), find: jest.fn(), create: jest.fn((v) => v), save: jest.fn((v) => ({ id: 'staff-1', ...v })) };
  const assignments = { find: jest.fn(), findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn((v) => v), update: jest.fn() };
  const venues = { find: jest.fn(), findOne: jest.fn() };
  const busyness = { findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn((v) => v) };
  const liveUpdates = { create: jest.fn((v) => v), save: jest.fn((v) => ({ id: 'live-1', ...v })), find: jest.fn() };
  const gateway = { broadcastBusynessUpdate: jest.fn(), broadcastWhatsOnUpdate: jest.fn() };
  let service: WorkerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerService(businessUsers as any, assignments as any, venues as any, busyness as any, liveUpdates as any, gateway as any);
  });

  it('returns assigned venues for staff without incorrectly requiring staff ownership', async () => {
    businessUsers.findOne.mockResolvedValue({ id: 'staff-1', role: BusinessRole.STAFF, isActive: true, isApproved: true });
    assignments.find.mockResolvedValue([{ venue: { id: 'venue-1', businessUserId: 'owner-1' } }]);
    await expect(service.getAssignedVenues('staff-1')).resolves.toEqual([{ id: 'venue-1', businessUserId: 'owner-1' }]);
  });

  it('rejects assigning staff from another tenant', async () => {
    businessUsers.findOne
      .mockResolvedValueOnce({ id: 'owner-1', role: BusinessRole.OWNER, isActive: true, isApproved: true })
      .mockResolvedValueOnce({ id: 'staff-2', role: BusinessRole.STAFF, accountOwnerId: 'owner-2', isActive: true });
    venues.findOne.mockResolvedValue({ id: 'venue-1', businessUserId: 'owner-1' });
    await expect(service.assignVenue('owner-1', 'venue-1', 'staff-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('persists and broadcasts a live whats-on update to the venue city', async () => {
    jest.spyOn(service, 'assertVenueAccess').mockResolvedValue({ id: 'venue-1', city: 'London' } as any);
    const result = await service.updateLiveInfo('staff-1', 'venue-1', { type: 'music', title: 'Live music tonight' });
    expect(result).toMatchObject({ id: 'live-1', venueId: 'venue-1', isActive: true });
    expect(gateway.broadcastWhatsOnUpdate).toHaveBeenCalledWith('london', 'venue-1', expect.objectContaining({ id: 'live-1' }));
  });

  it('updates busyness and broadcasts it for an assigned venue', async () => {
    jest.spyOn(service, 'assertVenueAccess').mockResolvedValue({ id: 'venue-1', city: 'Manchester' } as any);
    busyness.findOne.mockResolvedValue(null);
    await service.updateVenueStatus('staff-1', 'venue-1', BusynessLevel.BUSY);
    expect(busyness.save).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: 'staff-1' }));
    expect(gateway.broadcastBusynessUpdate).toHaveBeenCalled();
  });
});
