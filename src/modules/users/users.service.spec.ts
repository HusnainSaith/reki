import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: Record<string, jest.Mock>;
  let redemptionsRepo: Record<string, jest.Mock>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@reki.app',
    name: 'Test User',
    preferences: null,
    savedVenues: [],
  };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    redemptionsRepo = {
      find: jest.fn(),
    };
    const analyticsRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Redemption), useValue: redemptionsRepo },
        { provide: getRepositoryToken(VenueAnalytics), useValue: analyticsRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      expect(await service.findById('nope')).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@reki.app');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      usersRepo.find.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('getPreferences', () => {
    it('should return empty preferences for new user', async () => {
      usersRepo.findOne.mockResolvedValue({ ...mockUser, preferences: null });
      const result = await service.getPreferences('user-1');
      expect(result.hasPreferences).toBe(false);
      expect(result.preferences).toEqual({ vibes: [], music: [] });
    });

    it('should return saved preferences', async () => {
      const prefs = { vibes: ['Chill'], music: ['House'] };
      usersRepo.findOne.mockResolvedValue({ ...mockUser, preferences: prefs });
      const result = await service.getPreferences('user-1');
      expect(result.hasPreferences).toBe(true);
      expect(result.preferences.vibes).toContain('Chill');
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.getPreferences('gone')).rejects.toThrow(NotFoundException);
    });
  });

  describe('savePreferences', () => {
    it('should save vibes and music preferences', async () => {
      const user = { ...mockUser, preferences: null };
      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue(user);

      const result = await service.savePreferences('user-1', ['Chill', 'Party'], ['House']);
      expect(result.preferences.vibes).toEqual(['Chill', 'Party']);
      expect(result.preferences.music).toEqual(['House']);
    });

    it('should throw if user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.savePreferences('gone', [], [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSavedVenues', () => {
    it('should return empty array for new user', async () => {
      usersRepo.findOne.mockResolvedValue({ ...mockUser, savedVenues: [] });
      const result = await service.getSavedVenues('user-1');
      expect(result).toEqual([]);
    });

    it('should return saved venue IDs', async () => {
      usersRepo.findOne.mockResolvedValue({ ...mockUser, savedVenues: ['v-1', 'v-2'] });
      const result = await service.getSavedVenues('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('saveVenue', () => {
    it('should add venue to saved list', async () => {
      const user = { ...mockUser, savedVenues: [] };
      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue(user);

      const result = await service.saveVenue('user-1', 'v-1');
      expect(result.saved).toBe(true);
      expect(result.savedVenues).toContain('v-1');
    });

    it('should not duplicate venue ID', async () => {
      const user = { ...mockUser, savedVenues: ['v-1'] };
      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue(user);

      const result = await service.saveVenue('user-1', 'v-1');
      expect(result.savedVenues.filter((v: string) => v === 'v-1')).toHaveLength(1);
    });
  });

  describe('unsaveVenue', () => {
    it('should remove venue from saved list', async () => {
      const user = { ...mockUser, savedVenues: ['v-1', 'v-2'] };
      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue(user);

      const result = await service.unsaveVenue('user-1', 'v-1');
      expect(result.saved).toBe(false);
      expect(result.savedVenues).not.toContain('v-1');
    });
  });

  describe('getRedemptions', () => {
    it('should return paginated user redemptions', async () => {
      const redemptions = [{ id: 'r-1', offerId: 'o-1' }];
      redemptionsRepo.findAndCount = jest.fn().mockResolvedValue([redemptions, 1]);
      const result = await service.getRedemptions('user-1');
      expect(result.redemptions).toEqual(redemptions);
      expect(result.page).toBe(1);
      expect(result.total).toBe(1);
      expect(result.hasNext).toBe(false);
    });

    it('should respect page and limit params', async () => {
      redemptionsRepo.findAndCount = jest.fn().mockResolvedValue([[], 25]);
      const result = await service.getRedemptions('user-1', 2, 10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });
  });
});
