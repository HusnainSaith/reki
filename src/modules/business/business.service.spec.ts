import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BusinessService } from './business.service';
import { BusinessUser } from './entities/business-user.entity';
import { VenueAnalytics } from './entities/venue-analytics.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { BusynessLevel } from '../../common/enums';
import { PushService } from '../push/push.service';
import { LiveGateway } from '../live/live.gateway';
import { EmailService } from '../email/email.service';
import { City } from '../cities/entities/city.entity';

describe('BusinessService', () => {
  let service: BusinessService;
  let bizUsersRepo: Record<string, jest.Mock>;
  let analyticsRepo: Record<string, jest.Mock>;
  let venuesRepo: Record<string, jest.Mock>;
  let offersRepo: Record<string, jest.Mock>;
  let redemptionsRepo: Record<string, jest.Mock>;
  let busynessRepo: Record<string, jest.Mock>;
  let vibesRepo: Record<string, jest.Mock>;
  let notificationsRepo: Record<string, jest.Mock>;
  let usersRepo: Record<string, jest.Mock>;
  let activityLogsRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let citiesRepo: Record<string, jest.Mock>;

  const mockBizUser = {
    id: 'biz-1',
    email: 'manager@alberts.com',
    name: 'John Smith',
    password: '$2b$10$hashed',
    isApproved: true,
    isActive: true,
    venues: [{ id: 'venue-1', name: "Albert's Schloss", address: '27 Peter Street' }],
  };

  const mockVenue = {
    id: 'venue-1',
    name: "Albert's Schloss",
    address: '27 Peter Street',
    businessUserId: 'biz-1',
    openingHours: '12:00',
    closingTime: '02:00',
    isVerified: true,
    busyness: { level: 'busy', percentage: 85 },
    vibe: { tags: ['Party', 'Live Music'], musicGenre: ['House'] },
  };

  beforeEach(async () => {
    const mockUsersQB = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    bizUsersRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    analyticsRepo = { findOne: jest.fn(), find: jest.fn() };
    venuesRepo = { findOne: jest.fn(), count: jest.fn(), create: jest.fn(), save: jest.fn() };
    offersRepo = { findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    redemptionsRepo = { find: jest.fn(), createQueryBuilder: jest.fn() };
    busynessRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    vibesRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    notificationsRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn() };
    usersRepo = { find: jest.fn(), create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn().mockReturnValue(mockUsersQB) };
    activityLogsRepo = { create: jest.fn(), save: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('biz-token'), verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.nodeEnv') return 'development';
        return 'test-secret';
      }),
    };
    emailService = {
      sendPasswordResetEmail: jest.fn(),
    };
    citiesRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: getRepositoryToken(BusinessUser), useValue: bizUsersRepo },
        { provide: getRepositoryToken(VenueAnalytics), useValue: analyticsRepo },
        { provide: getRepositoryToken(Venue), useValue: venuesRepo },
        { provide: getRepositoryToken(Offer), useValue: offersRepo },
        { provide: getRepositoryToken(Redemption), useValue: redemptionsRepo },
        { provide: getRepositoryToken(Busyness), useValue: busynessRepo },
        { provide: getRepositoryToken(Vibe), useValue: vibesRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: activityLogsRepo },
        { provide: getRepositoryToken(City), useValue: citiesRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
        { provide: PushService, useValue: { sendToUser: jest.fn().mockResolvedValue({ sent: true }), sendToUsers: jest.fn().mockResolvedValue({ totalUsers: 0, sent: 0, skipped: 0 }) } },
        { provide: LiveGateway, useValue: { broadcastBusynessUpdate: jest.fn(), broadcastVibeUpdate: jest.fn(), broadcastNewOffer: jest.fn(), broadcastNewRedemption: jest.fn(), broadcastNewSave: jest.fn() } },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
    venuesRepo.findOne.mockResolvedValue(mockVenue);
  });

  describe('login', () => {
    it('should return user + tokens for valid credentials', async () => {
      const hashed = await bcrypt.hash('business123', 10);
      bizUsersRepo.findOne.mockResolvedValue({ ...mockBizUser, password: hashed });
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});

      const result = await service.login('manager@alberts.com', 'business123');
      expect(result.user.email).toBe('manager@alberts.com');
      expect(result.user.role).toBe('business');
      expect(result.user.venues[0].name).toBe("Albert's Schloss");
      expect(result.tokens.accessToken).toBe('biz-token');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      bizUsersRepo.findOne.mockResolvedValue(null);
      await expect(service.login('bad@email.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for unapproved account', async () => {
      const hashed = await bcrypt.hash('pass', 10);
      bizUsersRepo.findOne.mockResolvedValue({ ...mockBizUser, password: hashed, isApproved: false });
      await expect(service.login('manager@alberts.com', 'pass')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for deactivated account', async () => {
      const hashed = await bcrypt.hash('pass', 10);
      bizUsersRepo.findOne.mockResolvedValue({ ...mockBizUser, password: hashed, isActive: false });
      await expect(service.login('manager@alberts.com', 'pass')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('register', () => {
    it('should register new business and return pending status', async () => {
      bizUsersRepo.findOne.mockResolvedValue(null);
      bizUsersRepo.create.mockReturnValue({ id: 'new-biz' });
      bizUsersRepo.save.mockResolvedValue({ id: 'new-biz' });

      const result = await service.register({
        email: 'new@bar.com',
        password: 'Pass1234',
        name: 'New Owner',
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('approved');
      expect(result.message).toContain('create venues');
    });

    it('should throw ConflictException for duplicate email', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      await expect(
        service.register({ email: 'manager@alberts.com', password: 'Pass1234', name: 'X' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('forgotPassword', () => {
    it('should return reset token for existing business user', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      const result = await service.forgotPassword('manager@alberts.com');
      expect(result.message).toContain('reset link');
      expect('resetToken' in result).toBe(true);
      if ('resetToken' in result) {
        expect(result.resetToken).toBe('biz-token');
      }
    });

    it('should return generic message for non-existing email', async () => {
      bizUsersRepo.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword('nope@test.com');
      expect(result.message).toContain('reset link');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      jwtService.verify.mockReturnValue({ sub: mockBizUser.id, type: 'business-password-reset' });
      bizUsersRepo.findOne.mockResolvedValue({ ...mockBizUser });
      bizUsersRepo.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.resetPassword('valid-token', 'NewPass123');

      expect(result.message).toBe('Password reset successful');
      expect(bizUsersRepo.save).toHaveBeenCalled();
    });

    it('should throw for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('bad-token');
      });

      await expect(service.resetPassword('bad-token', 'NewPass123')).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });

    it('should throw for wrong token type', async () => {
      jwtService.verify.mockReturnValue({ sub: mockBizUser.id, type: 'password-reset' });

      await expect(service.resetPassword('wrong-type', 'NewPass123')).rejects.toThrow(
        'Invalid token type',
      );
    });
  });

  describe('updateVenueStatus', () => {
    it('should update busyness and vibes', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      venuesRepo.findOne.mockResolvedValue(mockVenue);
      busynessRepo.findOne.mockResolvedValue({ venueId: 'venue-1', level: 'quiet', percentage: 25 });
      busynessRepo.save.mockImplementation((b) => Promise.resolve(b));
      vibesRepo.findOne.mockResolvedValue({ venueId: 'venue-1', tags: [] });
      vibesRepo.save.mockImplementation((v) => Promise.resolve(v));
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});
      usersRepo.find.mockResolvedValue([]);
      notificationsRepo.create.mockReturnValue({});
      notificationsRepo.save.mockResolvedValue({});

      const result = await service.updateVenueStatus('venue-1', 'biz-1', BusynessLevel.BUSY, ['Party', 'High Energy']);
      expect(result.success).toBe(true);
      expect(result.venue.busyness.level).toBe(BusynessLevel.BUSY);
    });
  });

  describe('getVenueStatus', () => {
    it('should return current busyness and vibe', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      busynessRepo.findOne.mockResolvedValue({ level: 'busy', percentage: 85, updatedAt: new Date() });
      vibesRepo.findOne.mockResolvedValue({ tags: ['Party'], musicGenre: ['House'], updatedAt: new Date() });

      const result = await service.getVenueStatus('venue-1', 'biz-1');
      expect(result.busyness.level).toBe('busy');
      expect(result.vibe.tags).toContain('Party');
    });
  });

  describe('getVenueOffers', () => {
    it('should return active and past offers', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      offersRepo.findAndCount.mockResolvedValue([
        [
          { id: 'o-1', title: 'Happy Hour', isActive: true, validDays: ['Mon'], validTimeStart: '17:00', validTimeEnd: '19:00', redemptionCount: 5 },
          { id: 'o-2', title: 'Old Deal', isActive: false, validDays: [], redemptionCount: 0 },
        ],
        2,
      ]);

      const result = await service.getVenueOffers('venue-1', 'biz-1');
      expect(result.activeDeals).toBeDefined();
      expect(result.upcomingAndPast).toBeDefined();
    });
  });

  describe('createOffer', () => {
    it('should create a new offer and log activity', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      offersRepo.create.mockReturnValue({ id: 'new-offer', title: 'Test Offer', venueId: 'venue-1' });
      offersRepo.save.mockResolvedValue({ id: 'new-offer', title: 'Test Offer', venueId: 'venue-1' });
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});
      usersRepo.find.mockResolvedValue([]);
      notificationsRepo.create.mockReturnValue({});
      notificationsRepo.save.mockResolvedValue({});

      const result = await service.createOffer('venue-1', 'biz-1', {
        title: 'Test Offer',
        description: 'Test desc',
        type: '2-for-1' as any,
        validDays: ['Fri', 'Sat'],
        validTimeStart: '20:00',
        validTimeEnd: '23:00',
      } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('toggleOffer', () => {
    it('should toggle offer active status', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      offersRepo.findOne.mockResolvedValue({ id: 'o-1', venueId: 'venue-1', isActive: true });
      offersRepo.save.mockImplementation((o) => Promise.resolve(o));
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});

      const result = await service.toggleOffer('o-1', 'biz-1', false);
      expect(result.success).toBe(true);
      expect(result.offer.isActive).toBe(false);
    });
  });

  describe('deleteOffer', () => {
    it('should soft delete an offer', async () => {
      bizUsersRepo.findOne.mockResolvedValue(mockBizUser);
      offersRepo.findOne.mockResolvedValue({ id: 'o-1', venueId: 'venue-1' });
      offersRepo.delete.mockResolvedValue({ affected: 1 });
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});

      const result = await service.deleteOffer('o-1', 'biz-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Offer deleted');
    });
  });

  describe('createVenue', () => {
    const createDto = {
      name: 'The Blue Moon Bar',
      address: '123 Oxford Road, Manchester',
      city: 'Manchester',
      area: 'City Centre',
      category: 'bar',
      lat: 53.4808,
      lng: -2.2426,
      priceLevel: 2,
      openingHours: '18:00',
      closingTime: '02:00',
      tags: ['Chill', 'Party'],
      images: ['https://example.com/image1.jpg'],
    };

    beforeEach(() => {
      const cityQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'city-london', name: 'London', slug: 'london' }),
      };
      citiesRepo.createQueryBuilder.mockReturnValue(cityQueryBuilder);
      activityLogsRepo.create.mockReturnValue({});
      activityLogsRepo.save.mockResolvedValue({});
    });

    it('should create a venue and persist images', async () => {
      const savedVenue = { id: 'new-venue', ...createDto, category: 'bar' };
      venuesRepo.create.mockReturnValue(savedVenue);
      venuesRepo.save.mockResolvedValue(savedVenue);
      busynessRepo.create.mockReturnValue({});
      busynessRepo.save.mockResolvedValue({});
      vibesRepo.create.mockReturnValue({});
      vibesRepo.save.mockResolvedValue({});

      const result = await service.createVenue('biz-1', createDto as any);

      expect(result.success).toBe(true);
      expect(result.venue.id).toBe('new-venue');
      // verify images were passed to repository.create
      expect(venuesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ images: ['https://example.com/image1.jpg'] }),
      );
    });

    it('creates a venue in a supported city using its canonical name and id', async () => {
      const londonDto = { ...createDto, city: ' london ' };
      const savedVenue = { id: 'new-venue', ...londonDto, city: 'London', cityId: 'city-london', category: 'bar' };
      venuesRepo.create.mockReturnValue(savedVenue);
      venuesRepo.save.mockResolvedValue(savedVenue);
      busynessRepo.create.mockReturnValue({});
      busynessRepo.save.mockResolvedValue({});
      vibesRepo.create.mockReturnValue({});
      vibesRepo.save.mockResolvedValue({});

      await service.createVenue('biz-1', londonDto as any);

      expect(venuesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ city: 'London', cityId: 'city-london' }),
      );
    });

    it('creates a venue using an active city selected by id', async () => {
      const cityIdDto = { ...createDto, city: undefined, cityId: '8bd196bb-00e9-4712-850d-a9e157c1d133' };
      citiesRepo.findOne.mockResolvedValue({
        id: cityIdDto.cityId,
        name: 'Birmingham',
        slug: 'birmingham',
        isActive: true,
      });
      const savedVenue = { id: 'new-venue', ...cityIdDto, city: 'Birmingham', category: 'bar' };
      venuesRepo.create.mockReturnValue(savedVenue);
      venuesRepo.save.mockResolvedValue(savedVenue);
      busynessRepo.create.mockReturnValue({});
      busynessRepo.save.mockResolvedValue({});
      vibesRepo.create.mockReturnValue({});
      vibesRepo.save.mockResolvedValue({});

      await service.createVenue('biz-1', cityIdDto as any);

      expect(citiesRepo.findOne).toHaveBeenCalledWith({
        where: { id: cityIdDto.cityId, isActive: true },
      });
      expect(venuesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ city: 'Birmingham', cityId: cityIdDto.cityId }),
      );
    });

    it('should default images to empty array when not provided', async () => {
      const dtoWithoutImages = { ...createDto, images: undefined };
      const savedVenue = { id: 'new-venue', ...dtoWithoutImages, images: [] };
      venuesRepo.create.mockReturnValue(savedVenue);
      venuesRepo.save.mockResolvedValue(savedVenue);
      busynessRepo.create.mockReturnValue({});
      busynessRepo.save.mockResolvedValue({});
      vibesRepo.create.mockReturnValue({});
      vibesRepo.save.mockResolvedValue({});

      await service.createVenue('biz-1', dtoWithoutImages as any);

      expect(venuesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ images: [] }),
      );
    });
  });

  describe('getMyVenues', () => {
    it('should return venues with images field included', async () => {
      const venueWithImages = {
        id: 'venue-1',
        name: 'The Blue Moon Bar',
        address: '123 Oxford Road, Manchester',
        city: 'Manchester',
        area: 'City Centre',
        category: 'bar',
        lat: 53.4808,
        lng: -2.2426,
        images: ['https://example.com/image1.jpg'],
        priceLevel: 2,
        openingHours: '18:00',
        closingTime: '02:00',
        tags: ['Chill', 'Party'],
        rating: 4.0,
        isLive: false,
        businessUserId: 'biz-1',
        busyness: { level: 'quiet', percentage: 25 },
        vibe: { tags: [] },
        createdAt: new Date('2026-05-13T11:47:34.214Z'),
      };
      venuesRepo.find = jest.fn().mockResolvedValue([venueWithImages]);

      const result = await service.getMyVenues('biz-1');

      expect(result.total).toBe(1);
      expect(result.venues[0]).toHaveProperty('images');
      expect(result.venues[0].images).toEqual(['https://example.com/image1.jpg']);
    });

    it('should return empty images array when venue has no images', async () => {
      const venueWithNoImages = {
        id: 'venue-2',
        name: 'Test Venue',
        address: '1 Test St',
        city: 'Manchester',
        area: 'Test Area',
        category: 'bar',
        lat: 53.48,
        lng: -2.24,
        images: [],
        priceLevel: 1,
        openingHours: '12:00',
        closingTime: '23:00',
        tags: [],
        rating: 0,
        isLive: false,
        businessUserId: 'biz-1',
        busyness: { level: 'quiet', percentage: 0 },
        vibe: { tags: [] },
        createdAt: new Date(),
      };
      venuesRepo.find = jest.fn().mockResolvedValue([venueWithNoImages]);

      const result = await service.getMyVenues('biz-1');

      expect(result.venues[0]).toHaveProperty('images');
      expect(result.venues[0].images).toEqual([]);
    });

    it('should return all required fields including lat, lng, priceLevel, openingHours, closingTime, tags, rating', async () => {
      const venue = {
        id: 'venue-1',
        name: 'The Blue Moon Bar',
        address: '123 Oxford Road',
        city: 'Manchester',
        area: 'City Centre',
        category: 'bar',
        lat: 53.4808,
        lng: -2.2426,
        images: ['https://example.com/img.jpg'],
        priceLevel: 2,
        openingHours: '18:00',
        closingTime: '02:00',
        tags: ['Chill'],
        rating: 4.5,
        isLive: false,
        businessUserId: 'biz-1',
        busyness: { level: 'busy', percentage: 70 },
        vibe: { tags: ['Party'] },
        createdAt: new Date(),
      };
      venuesRepo.find = jest.fn().mockResolvedValue([venue]);

      const result = await service.getMyVenues('biz-1');
      const v = result.venues[0];

      expect(v).toHaveProperty('lat', 53.4808);
      expect(v).toHaveProperty('lng', -2.2426);
      expect(v).toHaveProperty('images', ['https://example.com/img.jpg']);
      expect(v).toHaveProperty('priceLevel', 2);
      expect(v).toHaveProperty('openingHours', '18:00');
      expect(v).toHaveProperty('closingTime', '02:00');
      expect(v).toHaveProperty('tags', ['Chill']);
      expect(v).toHaveProperty('rating', 4.5);
      expect(v.busyness).toEqual({ level: 'busy', percentage: 70 });
      expect(v.vibe).toEqual({ tags: ['Party'] });
    });
  });
});
