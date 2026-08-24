import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VibesService } from './vibes.service';
import { Vibe } from './entities/vibe.entity';

describe('VibesService', () => {
  let service: VibesService;
  let repo: Record<string, jest.Mock>;

  const mockVibe: Partial<Vibe> = {
    id: 'v-1',
    venueId: 'venue-1',
    tags: ['Chill', 'Romantic'],
    musicGenre: ['Lo-fi', 'Vinyl'],
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
        VibesService,
        { provide: getRepositoryToken(Vibe), useValue: repo },
      ],
    }).compile();

    service = module.get<VibesService>(VibesService);
  });

  describe('findByVenueId', () => {
    it('should return vibe for venue', async () => {
      repo.findOne.mockResolvedValue(mockVibe);
      const result = await service.findByVenueId('venue-1');
      expect(result).toEqual(mockVibe);
    });

    it('should return null if no vibe record', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findByVenueId('unknown')).toBeNull();
    });
  });

  describe('updateVibe', () => {
    it('should update existing vibe record', async () => {
      repo.findOne.mockResolvedValue({ ...mockVibe });
      repo.save.mockImplementation((v) => Promise.resolve(v));

      const result = await service.updateVibe('venue-1', ['High Energy', 'Packed'], ['House', 'Techno'], 'biz-1');
      expect(result.tags).toEqual(['High Energy', 'Packed']);
      expect(result.musicGenre).toEqual(['House', 'Techno']);
      expect(result.updatedBy).toBe('biz-1');
    });

    it('should create new vibe if none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ venueId: 'venue-1' });
      repo.save.mockImplementation((v) => Promise.resolve(v));

      const result = await service.updateVibe('venue-1', ['Chill']);
      expect(result.tags).toEqual(['Chill']);
    });

    it('should not overwrite musicGenre if not provided', async () => {
      const vibe = { ...mockVibe, musicGenre: ['House'] };
      repo.findOne.mockResolvedValue(vibe);
      repo.save.mockImplementation((v) => Promise.resolve(v));

      const result = await service.updateVibe('venue-1', ['Party']);
      expect(result.musicGenre).toEqual(['House']);
    });
  });

  describe('getScheduledVibe', () => {
    it('should return chill vibes for 18-20h', () => {
      const result = service.getScheduledVibe(18);
      expect(result.tags).toContain('Chill');
      expect(result.tags).toContain('Intimate');
      expect(result.musicGenre).toContain('Lo-fi');
    });

    it('should return live music vibes for 20-22h', () => {
      const result = service.getScheduledVibe(20);
      expect(result.tags).toContain('Live Music');
      expect(result.tags).toContain('Party');
    });

    it('should return high energy for 22h+', () => {
      const result = service.getScheduledVibe(23);
      expect(result.tags).toContain('High Energy');
      expect(result.tags).toContain('Packed');
      expect(result.musicGenre).toContain('House');
    });

    it('should return high energy for early morning (0-2h)', () => {
      const result = service.getScheduledVibe(1);
      expect(result.tags).toContain('High Energy');
    });

    it('should return daytime chill for other hours', () => {
      const result = service.getScheduledVibe(12);
      expect(result.tags).toContain('Chill');
      expect(result.description).toContain('Daytime');
    });
  });
});
