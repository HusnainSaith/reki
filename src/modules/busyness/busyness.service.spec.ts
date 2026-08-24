import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusynessService } from './busyness.service';
import { Busyness } from './entities/busyness.entity';
import { BusynessLevel } from '../../common/enums';

describe('BusynessService', () => {
  let service: BusynessService;
  let repo: Record<string, jest.Mock>;

  const mockBusyness: Partial<Busyness> = {
    id: 'b-1',
    venueId: 'venue-1',
    level: BusynessLevel.MODERATE,
    percentage: 50,
    updatedBy: 'user-1',
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusynessService,
        { provide: getRepositoryToken(Busyness), useValue: repo },
      ],
    }).compile();

    service = module.get<BusynessService>(BusynessService);
  });

  describe('findByVenueId', () => {
    it('should return busyness for venue', async () => {
      repo.findOne.mockResolvedValue(mockBusyness);
      const result = await service.findByVenueId('venue-1');
      expect(result).toEqual(mockBusyness);
    });

    it('should return null if no busyness record', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findByVenueId('unknown')).toBeNull();
    });
  });

  describe('updateLevel', () => {
    it('should update existing busyness record', async () => {
      repo.findOne.mockResolvedValue({ ...mockBusyness });
      repo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.updateLevel('venue-1', BusynessLevel.BUSY, 'user-1');
      expect(result.level).toBe(BusynessLevel.BUSY);
      expect(result.percentage).toBe(85);
    });

    it('should create new busyness record if none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ venueId: 'venue-1' });
      repo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.updateLevel('venue-1', BusynessLevel.QUIET, 'user-1');
      expect(result.level).toBe(BusynessLevel.QUIET);
      expect(result.percentage).toBe(25);
    });

    it('should map MODERATE to 50%', async () => {
      repo.findOne.mockResolvedValue({ ...mockBusyness });
      repo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.updateLevel('venue-1', BusynessLevel.MODERATE, 'user-1');
      expect(result.percentage).toBe(50);
    });
  });

  describe('getAtmosphereFromPercentage', () => {
    it('should return quiet for 0-33%', () => {
      expect(service.getAtmosphereFromPercentage(0)).toBe('quiet');
      expect(service.getAtmosphereFromPercentage(33)).toBe('quiet');
    });

    it('should return lively for 34-66%', () => {
      expect(service.getAtmosphereFromPercentage(34)).toBe('lively');
      expect(service.getAtmosphereFromPercentage(50)).toBe('lively');
      expect(service.getAtmosphereFromPercentage(66)).toBe('lively');
    });

    it('should return packed for 67-100%', () => {
      expect(service.getAtmosphereFromPercentage(67)).toBe('packed');
      expect(service.getAtmosphereFromPercentage(100)).toBe('packed');
    });
  });

  describe('matchesAtmosphere', () => {
    it('should match quiet for low percentage', () => {
      expect(service.matchesAtmosphere(20, 'quiet')).toBe(true);
      expect(service.matchesAtmosphere(50, 'quiet')).toBe(false);
    });

    it('should match lively for mid percentage', () => {
      expect(service.matchesAtmosphere(50, 'lively')).toBe(true);
      expect(service.matchesAtmosphere(20, 'lively')).toBe(false);
    });

    it('should match packed for high percentage', () => {
      expect(service.matchesAtmosphere(80, 'packed')).toBe(true);
      expect(service.matchesAtmosphere(50, 'packed')).toBe(false);
    });

    it('should return true for unknown atmosphere', () => {
      expect(service.matchesAtmosphere(50, 'unknown')).toBe(true);
    });
  });
});
