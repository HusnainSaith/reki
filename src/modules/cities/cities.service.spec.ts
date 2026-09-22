import { NotFoundException } from '@nestjs/common';
import { CitiesService } from './cities.service';

describe('CitiesService Phase 6', () => {
  const repository = { find: jest.fn() };
  const service = new CitiesService(repository as any);

  beforeEach(() => jest.clearAllMocks());

  it('resolves coordinates to the nearest city within its configured radius', async () => {
    repository.find.mockResolvedValue([
      { slug: 'manchester', latitude: 53.4808, longitude: -2.2426, detectionRadiusKm: 50 },
      { slug: 'london', latitude: 51.5074, longitude: -0.1278, detectionRadiusKm: 50 },
    ]);
    const result = await service.findNearest(53.481, -2.243);
    expect(result.city.slug).toBe('manchester');
    expect(result.distanceKm).toBeLessThan(1);
  });

  it('rejects coordinates outside all supported city radii', async () => {
    repository.find.mockResolvedValue([{ slug: 'manchester', latitude: 53.4808, longitude: -2.2426, detectionRadiusKm: 10 }]);
    await expect(service.findNearest(40.7128, -74.006)).rejects.toBeInstanceOf(NotFoundException);
  });
});
