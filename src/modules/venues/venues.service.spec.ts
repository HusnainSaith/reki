import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VenuesService } from './venues.service';
import { Venue } from './entities/venue.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';

describe('VenuesService', () => {
  let service: VenuesService;
  let venuesRepo: Record<string, jest.Mock>;
  let analyticsRepo: Record<string, jest.Mock>;

  const mockVenue = {
    id: 'venue-1',
    name: "Albert's Schloss",
    address: '27 Peter Street',
    city: 'Manchester',
    area: 'City Centre',
    category: 'bar',
    lat: 53.4774,
    lng: -2.2460,
    priceLevel: 3,
    openingHours: '12:00',
    closingTime: '02:00',
    busyness: { level: 'busy', percentage: 85 },
    vibe: { tags: ['Party', 'Live Music'], musicGenre: ['House'] },
    offers: [{ id: 'o-1', title: 'Happy Hour', isActive: true, type: '2-for-1' }],
  };

  beforeEach(async () => {
    const mockQB = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([mockVenue]),
      getRawMany: jest.fn().mockResolvedValue([{ tag: 'Chill' }, { tag: 'Party' }]),
    };

    venuesRepo = {
      find: jest.fn().mockResolvedValue([mockVenue]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };
    analyticsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        { provide: getRepositoryToken(Venue), useValue: venuesRepo },
        { provide: getRepositoryToken(VenueAnalytics), useValue: analyticsRepo },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
  });

  describe('findAll', () => {
    it('should return venues with pagination', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.venues).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
    });

    it('should enrich venues with isLive and busynessColor', async () => {
      const result = await service.findAll();
      expect(result.venues[0]).toHaveProperty('isLive');
      expect(result.venues[0]).toHaveProperty('busynessColor');
      expect(result.venues[0]).toHaveProperty('socialProof');
    });

    it('should calculate distance when user coordinates provided', async () => {
      const result = await service.findAll({ userLat: 53.4808, userLng: -2.2426 });
      expect(result.venues[0]).toHaveProperty('distance');
      expect(result.venues[0]).toHaveProperty('distanceMiles');
    });

    it('should attach activeOffer from offers', async () => {
      const result = await service.findAll();
      expect(result.venues[0].activeOffer).toBeDefined();
      expect(result.venues[0].activeOffer.title).toBe('Happy Hour');
    });
  });

  describe('search', () => {
    it('should search venues by query', async () => {
      const result = await service.search('albert');
      expect(result).toHaveLength(1);
    });
  });

  describe('getFilterOptions', () => {
    it('should return atmospheres, vibes, and price range', async () => {
      const result = await service.getFilterOptions();
      expect(result.atmospheres).toEqual(['Quiet', 'Lively', 'Packed']);
      expect(result.vibes).toContain('Chill');
      expect(result.priceRange).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return enriched venue by ID', async () => {
      venuesRepo.findOne.mockResolvedValue(mockVenue);
      const result = await service.findById('venue-1');
      expect(result.name).toBe("Albert's Schloss");
      expect(result).toHaveProperty('isLive');
      expect(result).toHaveProperty('busynessColor');
    });

    it('should return null for non-existing venue', async () => {
      venuesRepo.findOne.mockResolvedValue(null);
      expect(await service.findById('nope')).toBeNull();
    });

    it('should include distance when user coords provided', async () => {
      venuesRepo.findOne.mockResolvedValue(mockVenue);
      const result = await service.findById('venue-1', 53.4808, -2.2426);
      expect(result).toHaveProperty('distance');
    });
  });

  describe('getMapMarkers', () => {
    it('should return map markers with busyness info', async () => {
      const result = await service.getMapMarkers();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('venueId');
      expect(result[0]).toHaveProperty('busynessLevel');
      expect(result[0]).toHaveProperty('busynessColor');
      expect(result[0]).toHaveProperty('isLive');
    });

    it('should include distance when user coords provided', async () => {
      const result = await service.getMapMarkers('Manchester', 53.4808, -2.2426);
      expect(result[0]).toHaveProperty('distance');
    });
  });

  describe('getTrending', () => {
    it('should return top venues by busyness', async () => {
      const result = await service.getTrending();
      expect(result).toHaveLength(1);
    });
  });

  describe('isVenueLive', () => {
    it('should return true if current time is in opening hours', () => {
      const now = new Date();
      const currentHour = now.getHours();
      const venue = {
        openingHours: '00:00',
        closingTime: '23:59',
      } as Venue;
      expect(service.isVenueLive(venue)).toBe(true);
    });

    it('should return false if no opening hours defined', () => {
      const venue = { openingHours: null, closingTime: null } as Venue;
      expect(service.isVenueLive(venue)).toBe(false);
    });

    it('should handle overnight venues (opens 22:00, closes 05:00)', () => {
      const now = new Date();
      const currentHour = now.getHours();
      const venue = { openingHours: '22:00', closingTime: '05:00' } as Venue;
      const result = service.isVenueLive(venue);
      if (currentHour >= 22 || currentHour <= 5) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    });
  });

  describe('trackView', () => {
    it('should increment view count for existing analytics', async () => {
      analyticsRepo.findOne.mockResolvedValue({ venueId: 'venue-1', totalViews: 5 });
      analyticsRepo.save.mockResolvedValue({});
      await service.trackView('venue-1');
      expect(analyticsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalViews: 6 }),
      );
    });

    it('should create new analytics entry if none exists', async () => {
      analyticsRepo.findOne.mockResolvedValue(null);
      analyticsRepo.create.mockReturnValue({ venueId: 'venue-1', totalViews: 0 });
      analyticsRepo.save.mockResolvedValue({});
      await service.trackView('venue-1');
      expect(analyticsRepo.create).toHaveBeenCalled();
      expect(analyticsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalViews: 1 }),
      );
    });
  });
});
