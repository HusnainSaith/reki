import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { NotFoundException } from '@nestjs/common';

describe('VenuesController', () => {
  let controller: VenuesController;
  let service: Partial<VenuesService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ venues: [], total: 0 }),
      search: jest.fn().mockResolvedValue([{ id: 'v-1', name: 'Bar' }]),
      getFilterOptions: jest.fn().mockResolvedValue({ categories: [], vibes: [] }),
      getTrending: jest.fn().mockResolvedValue([]),
      getMapMarkers: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: 'v-1', name: 'Bar' }),
      trackView: jest.fn().mockResolvedValue(undefined),
    };
    controller = new VenuesController(service as VenuesService, {} as any);
  });

  it('findAll', async () => {
    const result = await controller.findAll('Manchester', 'bar', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { user: null });
    expect(service.findAll).toHaveBeenCalled();
    expect(result.city).toBe('Manchester');
  });

  it('findAll defaults city to Manchester', async () => {
    const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {});
    expect(result.city).toBe('Manchester');
  });

  it('search', async () => {
    const result = await controller.search('alberts');
    expect(service.search).toHaveBeenCalledWith('alberts', undefined);
    expect(result.count).toBe(1);
  });

  it('getFilterOptions', async () => {
    await controller.getFilterOptions('Manchester');
    expect(service.getFilterOptions).toHaveBeenCalledWith('Manchester');
  });

  it('getTrending', async () => {
    await controller.getTrending();
    expect(service.getTrending).toHaveBeenCalled();
  });

  it('getMapMarkers', async () => {
    await controller.getMapMarkers('Manchester', '53.48', '-2.24');
    expect(service.getMapMarkers).toHaveBeenCalledWith('Manchester', 53.48, -2.24, undefined);
  });

  it('findOne', async () => {
    const result = await controller.findOne('v-1', '53.48', '-2.24');
    expect(service.findById).toHaveBeenCalledWith('v-1', 53.48, -2.24);
    expect(result).toHaveProperty('id');
  });

  it('findOne throws NotFoundException', async () => {
    (service.findById as jest.Mock).mockResolvedValue(null);
    await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
  });

  it('trackView', async () => {
    const result = await controller.trackView('v-1');
    expect(service.trackView).toHaveBeenCalledWith('v-1');
    expect(result.success).toBe(true);
  });
});
