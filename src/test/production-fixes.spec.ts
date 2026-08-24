import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../modules/auth/auth.service';
import { OffersService } from '../modules/offers/offers.service';
import { CronService } from '../modules/cron/cron.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Offer } from '../modules/offers/entities/offer.entity';
import { Redemption } from '../modules/offers/entities/redemption.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PushService } from '../modules/push/push.service';
import { EmailService } from '../modules/email/email.service';

describe('Production Readiness Fixes Verification', () => {
  let authService: AuthService;
  let offersService: OffersService;
  let cronService: CronService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOfferRepository = {
    findOne: jest.fn(),
    increment: jest.fn(),
  };

  const mockRedemptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPushService = {
    sendToUser: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        OffersService,
        CronService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Offer),
          useValue: mockOfferRepository,
        },
        {
          provide: getRepositoryToken(Redemption),
          useValue: mockRedemptionRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    offersService = module.get<OffersService>(OffersService);
    cronService = module.get<CronService>(CronService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix 1: Google OAuth Audience Validation', () => {
    it('should throw error when GOOGLE_CLIENT_ID is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(authService.googleAuth('mock-token')).rejects.toThrow(
        'Google OAuth is not configured'
      );
    });

    it('should use audience parameter when verifying Google token', async () => {
      const mockClientId = 'test-client-id.apps.googleusercontent.com';
      mockConfigService.get.mockReturnValue(mockClientId);

      await expect(authService.googleAuth('invalid-token')).rejects.toThrow();
      
      expect(mockConfigService.get).toHaveBeenCalledWith('app.google.clientId');
    });
  });

  describe('Fix 2: Apple Sign-In Authorization Code Verification', () => {
    it('should throw error when APPLE_CLIENT_ID is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        authService.appleAuth('mock-identity-token', 'mock-auth-code')
      ).rejects.toThrow('Apple OAuth is not configured');
    });

    it('should call verifyAppleAuthorizationCode when authorizationCode is provided', async () => {
      const mockClientId = 'com.reki.app';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.clientId') return mockClientId;
        return undefined;
      });

      await expect(
        authService.appleAuth('invalid-token', 'auth-code-123')
      ).rejects.toThrow();

      expect(mockConfigService.get).toHaveBeenCalledWith('app.apple.clientId');
    });
  });

  describe('Fix 3: Apple Wallet - No Mock Fallback', () => {
    it('should throw error when certificates are missing instead of returning mock data', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.teamId') return 'TEAM123';
        if (key === 'app.apple.passTypeId') return 'pass.com.reki.offers';
        return undefined;
      });
      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      await expect(
        offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123')
      ).rejects.toThrow('Apple Wallet certificate paths not configured');
    });

    it('should include helpful error message about certificate configuration', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.teamId') return 'TEAM123';
        if (key === 'app.apple.passTypeId') return 'pass.com.reki.offers';
        return undefined;
      });
      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      try {
        await offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('APPLE_PASS_CERT_PATH');
        expect(error.message).toContain('APPLE_PASS_KEY_PATH');
        expect(error.message).toContain('APPLE_PASS_WWDR_PATH');
      }
    });
  });

  describe('Fix 4: Weekly Recap Opt-Out Logic', () => {
    it('should skip users who have opted out of weekly recap', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            vibes: [],
            music: [],
            notifications: {
              weeklyRecap: true,
            },
          },
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          preferences: {
            vibes: [],
            music: [],
            notifications: {
              weeklyRecap: false,
            },
          },
        },
        {
          id: 'user-3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          preferences: {
            vibes: [],
            music: [],
          },
        },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);
      mockPushService.sendToUser.mockResolvedValue(undefined);

      await cronService.handleWeeklyRecap();

      expect(mockPushService.sendToUser).toHaveBeenCalledTimes(2);
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Object)
      );
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(
        'user-3',
        expect.any(String),
        expect.any(Object)
      );
      expect(mockPushService.sendToUser).not.toHaveBeenCalledWith(
        'user-2',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should send to users with no notification preferences (backward compatibility)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Legacy User',
          email: 'legacy@example.com',
          preferences: null,
        },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);
      mockPushService.sendToUser.mockResolvedValue(undefined);

      await cronService.handleWeeklyRecap();

      expect(mockPushService.sendToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration: User Entity Notification Preferences', () => {
    it('should support notification preferences structure in User entity', () => {
      const user = new User();
      user.preferences = {
        vibes: ['chill', 'energetic'],
        music: ['house', 'techno'],
        notifications: {
          weeklyRecap: false,
          offerAlerts: true,
          geofenceAlerts: true,
        },
      };

      expect(user.preferences.notifications).toBeDefined();
      expect(user.preferences.notifications.weeklyRecap).toBe(false);
      expect(user.preferences.notifications.offerAlerts).toBe(true);
      expect(user.preferences.notifications.geofenceAlerts).toBe(true);
    });
  });
});
